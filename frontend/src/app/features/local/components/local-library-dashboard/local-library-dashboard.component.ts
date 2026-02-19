import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { LocalLibraryService } from '../../services/local-library.service';
import { LocalPlaylistsService, LIBRARY_VIEW, LocalPlaylistId } from '../../services/local-playlists.service';
import { PlaylistInstanceService } from '../../../../core/playback/playlist-instance';
import { PlaybackStateStore } from '../../../../core/playback/playback-state.store';
import { Song } from '../../../../shared/models/song.model';

interface ModalState {
  audioFile: File | null;
  coverFile: File | null;
  coverPreviewUrl: string | null;
  title: string;
  artist: string;
  album: string;
  submitting: boolean;
}

@Component({
  selector: 'app-local-library-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './local-library-dashboard.component.html',
  styleUrl: './local-library-dashboard.component.css',
})
export class LocalLibraryDashboardComponent implements OnDestroy {
  private readonly localLibrary = inject(LocalLibraryService);
  readonly localPlaylists = inject(LocalPlaylistsService);
  private readonly c = inject(PlaylistInstanceService);
  private readonly playbackState = inject(PlaybackStateStore);
  private readonly router = inject(Router);

  readonly LIBRARY_VIEW = LIBRARY_VIEW;

  readonly tracks = this.localLibrary.tracks;
  readonly searchQuery = signal('');
  readonly modalOpen = signal(false);

  // ── Add-Songs modal (for adding tracks while in a playlist view) ──────────────
  readonly addSongsModalOpen = signal(false);
  readonly addSongsQuery = signal('');

  // ── Quick-add confirmation state (PR5.2) ──────────────────────────────────────
  private readonly _justAddedIds = signal<ReadonlySet<string>>(new Set());
  readonly justAddedIds = this._justAddedIds.asReadonly();
  private readonly _justAddedTimers = new Map<string, ReturnType<typeof setTimeout>>();

  isJustAdded(songId: string): boolean {
    return this._justAddedIds().has(songId);
  }

  ngOnDestroy(): void {
    this._justAddedTimers.forEach(t => clearTimeout(t));
    this._justAddedTimers.clear();
  }

  private flashJustAdded(songId: string): void {
    if (this._justAddedTimers.has(songId)) clearTimeout(this._justAddedTimers.get(songId)!);
    this._justAddedIds.update(s => new Set([...s, songId]));
    const t = setTimeout(() => {
      this._justAddedIds.update(s => { const n = new Set(s); n.delete(songId); return n; });
      this._justAddedTimers.delete(songId);
    }, 900);
    this._justAddedTimers.set(songId, t);
  }

  private readonly _modal = signal<ModalState>({
    audioFile: null,
    coverFile: null,
    coverPreviewUrl: null,
    title: '',
    artist: '',
    album: '',
    submitting: false,
  });
  readonly modal = this._modal.asReadonly();

  // ── View helpers ─────────────────────────────────────────────────────────────

  isLibraryView(): boolean {
    return this.localPlaylists.activePlaylistId() === LIBRARY_VIEW;
  }

  activePlaylistName(): string {
    const id = this.localPlaylists.activePlaylistId();
    if (id === LIBRARY_VIEW) return 'All Tracks';
    return this.localPlaylists.playlists().find(p => p.id === id)?.name ?? 'Playlist';
  }

  filteredTracks(): Song[] {
    const q = this.searchQuery().toLowerCase().trim();
    const source = this.localPlaylists.activePlaylistTracks();
    if (!q) return source;
    return source.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.artist ?? '').toLowerCase().includes(q)
    );
  }

  isActive(song: Song): boolean {
    return this.c.track()?.id === song.id;
  }

  // ── Membership helpers (Task A) ───────────────────────────────────────────────

  getMembership(songId: string): string[] {
    return this.localPlaylists.trackMembership().get(songId) ?? [];
  }

  getMembershipFirstName(songId: string): string {
    const id = this.getMembership(songId)[0];
    return this.localPlaylists.playlists().find(p => p.id === id)?.name ?? '?';
  }

  getMembershipTooltip(songId: string): string {
    const ids = this.getMembership(songId);
    const names = ids.map(id => this.localPlaylists.playlists().find(p => p.id === id)?.name ?? '?');
    return 'In: ' + names.join(', ');
  }

  // ── Add-Songs modal helpers (Task B) ─────────────────────────────────────────

  filteredLibraryTracks(): Song[] {
    const q = this.addSongsQuery().toLowerCase().trim();
    const all = this.localLibrary.tracks();
    if (!q) return all;
    return all.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.artist ?? '').toLowerCase().includes(q)
    );
  }

  isInActivePlaylist(songId: string): boolean {
    return this.localPlaylists.activePlaylistTracks().some(s => s.id === songId);
  }

  onAddSongToActivePlaylist(song: Song): void {
    const id = this.localPlaylists.activePlaylistId();
    if (id === LIBRARY_VIEW) return;
    this.localPlaylists.addTrackToPlaylist(id, song.id).catch(err =>
      console.error('[LocalLibraryDashboard] addTrackToPlaylist failed', err)
    );
    this.flashJustAdded(song.id);
  }

  openAddSongsModal(): void {
    this.addSongsQuery.set('');
    this.addSongsModalOpen.set(true);
  }

  closeAddSongsModal(): void {
    this.addSongsModalOpen.set(false);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/platform/local']);
  }

  selectView(id: LocalPlaylistId): void {
    this.localPlaylists.setActivePlaylist(id);
    this.searchQuery.set('');
  }

  // ── Playlist management ───────────────────────────────────────────────────────

  onNewPlaylist(): void {
    const name = prompt('Playlist name:');
    if (!name?.trim()) return;
    this.localPlaylists.createPlaylist(name.trim()).catch(err =>
      console.error('[LocalLibraryDashboard] createPlaylist failed', err)
    );
  }

  onDeletePlaylist(): void {
    const id = this.localPlaylists.activePlaylistId();
    if (id === LIBRARY_VIEW) return;
    const name = this.activePlaylistName();
    if (!confirm(`Delete playlist "${name}"? Tracks will remain in your library.`)) return;
    this.localPlaylists.deletePlaylist(id).catch(err =>
      console.error('[LocalLibraryDashboard] deletePlaylist failed', err)
    );
  }

  onAddToPlaylist(song: Song, event: Event): void {
    event.stopPropagation();
    const select = event.target as HTMLSelectElement;
    const playlistId = select.value;
    if (!playlistId) { select.value = ''; return; }
    this.localPlaylists.addTrackToPlaylist(playlistId, song.id).catch(err =>
      console.error('[LocalLibraryDashboard] addTrackToPlaylist failed', err)
    );
    select.value = '';
    this.flashJustAdded(song.id);
  }

  onRemoveFromPlaylist(event: MouseEvent, song: Song): void {
    event.stopPropagation();
    const playlistId = this.localPlaylists.activePlaylistId();
    if (playlistId === LIBRARY_VIEW) return;
    this.localPlaylists.removeTrackFromPlaylist(playlistId, song.id).catch(err =>
      console.error('[LocalLibraryDashboard] removeTrackFromPlaylist failed', err)
    );
  }

  // ── Track playback ────────────────────────────────────────────────────────────

  onSongSelected(song: Song): void {
    this.localLibrary.getPlayableUrl(song.id).then(url => {
      const playableSong: Song = { ...song, uri: url };
      const songs = this.localPlaylists.activePlaylistTracks();
      this.c.syncPlaylist(songs, song.id);
      this.c.selectTrack(playableSong);
      this.c.setPlatform('local');
      this.router.navigate(['/platform/local']);
    }).catch(err => console.error('[LocalLibraryDashboard] getPlayableUrl failed', err));
  }

  onSongRemoved(event: MouseEvent, song: Song): void {
    event.stopPropagation();
    if (!confirm(`Remove "${song.name}" from your local library?`)) return;
    if (this.c.track()?.id === song.id) {
      this.c.pause();
      this.playbackState.setCurrentTrack(null);
    }
    this.localLibrary.removeTrack(song.id).catch(err =>
      console.error('[LocalLibraryDashboard] removeTrack failed', err)
    );
  }

  // ── Import modal ──────────────────────────────────────────────────────────────

  openModal(): void {
    this._modal.set({
      audioFile: null,
      coverFile: null,
      coverPreviewUrl: null,
      title: '',
      artist: '',
      album: '',
      submitting: false,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    const prev = this._modal().coverPreviewUrl;
    if (prev) URL.revokeObjectURL(prev);
    this.modalOpen.set(false);
  }

  onAudioFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    const currentTitle = this._modal().title;
    const derivedTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    this._modal.update(m => ({
      ...m,
      audioFile: file,
      title: currentTitle || derivedTitle,
    }));
  }

  onCoverFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    const prev = this._modal().coverPreviewUrl;
    if (prev) URL.revokeObjectURL(prev);
    const previewUrl = URL.createObjectURL(file);
    this._modal.update(m => ({ ...m, coverFile: file, coverPreviewUrl: previewUrl }));
  }

  onTitleInput(event: Event): void {
    this._modal.update(m => ({ ...m, title: (event.target as HTMLInputElement).value }));
  }

  onArtistInput(event: Event): void {
    this._modal.update(m => ({ ...m, artist: (event.target as HTMLInputElement).value }));
  }

  onAlbumInput(event: Event): void {
    this._modal.update(m => ({ ...m, album: (event.target as HTMLInputElement).value }));
  }

  async onModalSubmit(): Promise<void> {
    const m = this._modal();
    if (!m.audioFile || m.submitting) return;

    this._modal.update(s => ({ ...s, submitting: true }));
    try {
      await this.localLibrary.importWithMetadata({
        file:   m.audioFile,
        title:  m.title || undefined,
        artist: m.artist || undefined,
        album:  m.album || undefined,
        cover:  m.coverFile,
      });
      this.closeModal();
    } catch (err) {
      console.error('[LocalLibraryDashboard] importWithMetadata failed', err);
      this._modal.update(s => ({ ...s, submitting: false }));
    }
  }
}

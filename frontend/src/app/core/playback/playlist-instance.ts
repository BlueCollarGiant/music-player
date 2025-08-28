import { Injectable, inject, computed, effect } from '@angular/core';
import { PlaybackStateStore } from './playback-state.store';
import { PlayListLogicService } from '../../features/music-player/services/play-list-logic.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { Song } from '../../shared/models/song.model';


@Injectable({ providedIn: 'root' })
export class PlaylistInstanceService {
  private readonly state = inject(PlaybackStateStore);
  private readonly logic = inject(PlayListLogicService);
  private readonly registry = inject(AdapterRegistryService);
  constructor() {
    console.log('[Instance] PlaylistInstanceService CREATED', new Date().toISOString());
  }

  // Active adapter based on platform kind
  private readonly activeAdapter = computed(() => {
    const kind = this.state.platformKind();
    return kind ? this.registry.get(kind as any) : null;
  });

  // Selection effect: load track into adapter & resume if playing
  private readonly selectionEffect = effect(() => {
    const track: any = this.state.currentTrack();
    const kind = this.state.platformKind();
    const adapter: any = this.activeAdapter();
    if (!track || !kind || !adapter) return;
    const incomingId = track.id || track.uri || null;
    const currentId = adapter.currentIdOrUri?.() || null;
    console.log('[select-effect]', {
  kind,
  incomingId,
  currentId,
  hasAdapter: !!adapter,
  playerReady: adapter?.isReady?.()
});
    if (incomingId && currentId !== incomingId) {
      try { adapter.load(track); } catch {}
    }
    if (this.state.isPlaying()) {
      try { adapter.resume?.(); } catch {}
    }
  });

  // ---- Read API (signals mirror) ----
  readonly isReady       = () => this.state.isReady();
  readonly isPlaying     = () => this.state.isPlaying();
  readonly duration      = () => this.state.durationSeconds();
  readonly current       = () => this.state.currentTimeSeconds();
  readonly track         = () => this.state.currentTrack();
  readonly kind          = () => this.state.platformKind();

  // Optional convenience
  readonly tracks        = () => this.logic.items();
  readonly index         = () => this.logic.index(); // if you already expose it; otherwise omit

  // ---- Write API / Commands ----
  selectTrack(song: Song) { this.state.setCurrentTrack(song); }
  setPlatform(kind: 'youtube' | 'spotify' | 'soundcloud') {
  this.state.setPlatformKind(kind as any);
}

  // Transport controls implemented locally
  play(): void {
    if (this.state.isPlaying()) return;
    this.activeAdapter()?.start?.();
    this.state.setPlaying(true);
  }

  pause(): void {
    if (!this.state.isPlaying()) return;
    this.activeAdapter()?.pause?.();
    this.state.setPlaying(false);
  }

  toggle(): void {
    const isPlaying = this.state.isPlaying();
    const duration = this.state.durationSeconds();
    const position = this.state.currentTimeSeconds();
    if (isPlaying) {
      this.pause();
    } else if (duration > 0 && position > 0) {
      // treat as resume
      this.activeAdapter()?.resume?.();
      this.state.setPlaying(true);
    } else {
      this.play();
    }
  }

  next(): void {
    const song = this.logic.next(false);
    if (song) this.state.setCurrentTrack(song);
  }

  prev(): void {
    const song = this.logic.previous(false);
    if (song) this.state.setCurrentTrack(song);
  }

  seek(seconds: number): void { this.activeAdapter()?.seek?.(seconds); }


  syncPlaylist(songs: Song[], currentId?: string): void {
  if (!Array.isArray(songs) || songs.length === 0) return;

  // Be defensive about available API on PlayListLogicService
  const logic: any = this.logic;
  const sizeBefore = this.logic.size?.() ?? 0;

  if (logic.set) {
    // Preferred: set(items, startIndex?)
    const startIndex = currentId ? songs.findIndex(s => s.id === currentId) : 0;
    logic.set(songs, startIndex >= 0 ? startIndex : 0);
  } else if (logic.replaceAll) {
    logic.replaceAll(songs);
    if (currentId && logic.selectById) logic.selectById(currentId);
    else if (logic.selectIndex) logic.selectIndex(0);
  } else if (logic.addMany) {
    if (sizeBefore === 0) logic.addMany(songs);
    if (currentId && logic.selectById) logic.selectById(currentId);
    else if (logic.selectIndex) logic.selectIndex(0);
  } else {
    // Last resort: try common spellings
    if (logic.reset) logic.reset(songs);
    if (currentId && logic.selectById) logic.selectById(currentId);
  }
}
  // Adapter attach passthroughs
  attachYouTubePlayer(player: any) { console.log('[Instance] attachYouTubePlayer()', player ? 'ok' : 'null'); try { this.registry.getYouTubeAdapter().setPlayer(player); } catch {} }
  attachSpotifyPlayer(player: any) {  console.log('[Instance] attachSpotifyPlayer()', player ? 'ok' : 'null'); try { this.registry.getSpotifyAdapter().setPlayer(player); } catch {} }
}
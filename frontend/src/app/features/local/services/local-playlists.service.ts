import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Song } from '../../../shared/models/song.model';
import { localDb, PlaylistRecord } from './local-db';
import { LocalLibraryService } from './local-library.service';

export type { PlaylistRecord };

/** Sentinel value meaning "show all library tracks" rather than a named playlist. */
export const LIBRARY_VIEW = 'library' as const;
export type LocalPlaylistId = string | typeof LIBRARY_VIEW;

@Injectable({ providedIn: 'root' })
export class LocalPlaylistsService {
  private readonly library = inject(LocalLibraryService);

  // ── Private writable signals ──────────────────────────────────────────────
  private readonly _playlists = signal<PlaylistRecord[]>([]);
  private readonly _activeId = signal<LocalPlaylistId>(LIBRARY_VIEW);

  // ── Public readonly signals ───────────────────────────────────────────────
  readonly playlists = this._playlists.asReadonly();
  readonly activePlaylistId = this._activeId.asReadonly();

  /** Track IDs belonging to the currently active playlist, in order. */
  private readonly _activeTrackIds = signal<string[]>([]);

  /**
   * Map of trackId → playlistId[] for all playlists.
   * Updated after any mutation (create/delete playlist, add/remove track).
   */
  private readonly _membershipMap = signal<Map<string, string[]>>(new Map());
  /** Public readonly view: trackId → playlistId[] */
  readonly trackMembership = this._membershipMap.asReadonly();

  /**
   * Songs for the active view:
   * - 'library' → all library tracks
   * - named playlist → only tracks that exist in both the playlist and the library (joined)
   */
  readonly activePlaylistTracks = computed<Song[]>(() => {
    const id = this._activeId();
    if (id === LIBRARY_VIEW) return this.library.tracks();
    const ids = this._activeTrackIds();
    const byId = new Map(this.library.tracks().map(s => [s.id, s]));
    return ids.map(tid => byId.get(tid)).filter((s): s is Song => s != null);
  });

  constructor() {
    this.loadPlaylists();
    // When library tracks change (e.g., after removeTrack cascade), refresh the
    // active playlist track IDs so the computed signal stays consistent.
    effect(() => {
      this.library.tracks(); // subscribe to changes
      const active = this._activeId();
      if (active !== LIBRARY_VIEW) {
        this.loadActiveTrackIds(active);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async createPlaylist(name: string): Promise<PlaylistRecord> {
    const record: PlaylistRecord = {
      id:        crypto.randomUUID(),
      name:      name.trim(),
      createdAt: Date.now(),
    };
    await localDb.playlists.add(record);
    await this.loadPlaylists();
    return record;
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await localDb.transaction('rw', localDb.playlists, localDb.playlistTracks, async () => {
      await localDb.playlists.delete(playlistId);
      await localDb.playlistTracks.where('playlistId').equals(playlistId).delete();
    });
    if (this._activeId() === playlistId) {
      this._activeId.set(LIBRARY_VIEW);
      this._activeTrackIds.set([]);
    }
    await this.loadPlaylists();
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    // Prevent duplicates — compound key uniqueness handles DB level, but skip if already present
    const existing = await localDb.playlistTracks.get([playlistId, trackId]);
    if (existing) return;
    const count = await localDb.playlistTracks.where('playlistId').equals(playlistId).count();
    await localDb.playlistTracks.add({ playlistId, trackId, order: count });
    if (this._activeId() === playlistId) {
      await this.loadActiveTrackIds(playlistId);
    }
    await this.loadMembershipMap();
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    await localDb.playlistTracks.delete([playlistId, trackId]);
    if (this._activeId() === playlistId) {
      await this.loadActiveTrackIds(playlistId);
    }
    await this.loadMembershipMap();
  }

  /** Cascade: remove a track from ALL playlists. Called by LocalLibraryService.removeTrack(). */
  async removeTrackFromAllPlaylists(trackId: string): Promise<void> {
    await localDb.playlistTracks.where('trackId').equals(trackId).delete();
    const active = this._activeId();
    if (active !== LIBRARY_VIEW) {
      await this.loadActiveTrackIds(active);
    }
    await this.loadMembershipMap();
  }

  setActivePlaylist(id: LocalPlaylistId): void {
    this._activeId.set(id);
    if (id === LIBRARY_VIEW) {
      this._activeTrackIds.set([]);
    } else {
      this.loadActiveTrackIds(id);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async loadPlaylists(): Promise<void> {
    const records = await localDb.playlists.orderBy('createdAt').toArray();
    this._playlists.set(records);
    await this.loadMembershipMap();
  }

  private async loadMembershipMap(): Promise<void> {
    const rows = await localDb.playlistTracks.toArray();
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.trackId) ?? [];
      list.push(row.playlistId);
      map.set(row.trackId, list);
    }
    this._membershipMap.set(map);
  }

  private async loadActiveTrackIds(playlistId: string): Promise<void> {
    const rows = await localDb.playlistTracks
      .where('playlistId').equals(playlistId)
      .sortBy('order');
    this._activeTrackIds.set(rows.map(r => r.trackId));
  }
}

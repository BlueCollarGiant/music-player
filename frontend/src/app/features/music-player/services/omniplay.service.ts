import { Injectable, signal, computed, inject } from '@angular/core';
import { YouTubeService } from './youtube.service';
import { SpotifyService } from './spotify.service';
import { Song } from '../../../shared/models/song.model';
import { PlaylistInstanceService } from '../../../core/playback/playlist-instance';

/** Centralizes heavy merging / dedupe / shuffle for omniplay to keep component light. */
@Injectable({ providedIn: 'root' })
export class OmniplayService {
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService);
  private readonly instance = inject(PlaylistInstanceService);

  // Track whether initial shuffled seed already applied so we only shuffle once.
  private initialSeedApplied = signal(false);

  /** Current merged & de-duped song list (reactive). */
  readonly mergedSongs = computed(() => {
    const songs: Song[] = [];
    if (this.yt.selectedPlaylist()) {
      try { songs.push(...this.yt.toSongs()); } catch {}
    }
    if (this.sp.selectedPlaylist()) {
      try { songs.push(...this.sp.toSongs()); } catch {}
    }
    // Dedupe by platform:id
    const map = new Map<string, Song>();
    for (const s of songs) {
      if (!s?.id) continue;
      const key = `${s.platform}:${s.id}`;
      if (!map.has(key)) map.set(key, s);
    }
    return Array.from(map.values());
  });

  /** Call after either side selects/loads its playlist tracks. */
  recomputeAndSync(): void {
    const list = this.mergedSongs();
    if (list.length === 0) return;

    let final = list;
    if (!this.initialSeedApplied()) {
      final = this.shuffle(list.slice());
      this.initialSeedApplied.set(true);
    }
    this.instance.syncPlaylist(final);
  }

  /** Reset omniplay session (e.g., leaving omniplay). */
  reset(): void { this.initialSeedApplied.set(false); }

  private shuffle(arr: Song[]): Song[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

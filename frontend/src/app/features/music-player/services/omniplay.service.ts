import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { YouTubeService } from './youtube.service';
import { SpotifyService } from './spotify.service';
import { Song } from '../../../shared/models/song.model';
import { PlaylistInstanceService } from '../../../core/playback/playlist-instance';


@Injectable({ providedIn: 'root' })
export class OmniplayService {
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService);
  private readonly instance = inject(PlaylistInstanceService);

  // ── Activation state ──────────────────────────────────────────────────────

  private readonly _active = signal(true); 
  readonly isActive = computed(() => this._active()); // used internally by effect

  // Persistent ordering layer state
  private orderMap = new Map<string, number>(); // key -> order index
  private nextOrderIndex = 0;
  private membershipSignature = '';
  private lastOrderedSignature = '';

  // Processing / debounce
  private debounceHandle: any = null;
  private pendingSync = false;

  // Logging / tracking
  private prevPlatformCount = 0;
  private firstPlatformLogged = false;
  private secondPlatformLogged = false;
  private lastYtPlaylistIdCommitted: string | null = null;
  private lastSpPlaylistIdCommitted: string | null = null;
  private prevCommittedPlatformCount = 0;
  private reshuffleRequested = false; // external triggers (playlist change / platform growth)
  private initialMultiCommitDone = false;
  private lastPlaylistChangeAt = 0; // timestamp of last playlist id change
  private readonly playlistChangeGraceMs = 1500; // window to allow second-phase reshuffle after tracks load
  private postChangeReshuffleDone = false; // ensure only one second-phase reshuffle per change

  /** Raw merged & de-duped (order not yet persisted). */
  private readonly rawMergedSongs = computed(() => {
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

  /** Ordered list signal (persistent order after first multi-platform shuffle). */
  private readonly orderedListSig = signal<Song[]>([]);

  /** Public merged songs (keeps old name for UI). Provides persistent ordered list for single or multi-platform. */
  readonly mergedSongs = computed(() => {
    const ordered = this.orderedListSig();
    // If we have an ordered list (from shuffle), use it regardless of platform count
    if (ordered.length > 0) return ordered;
    // Otherwise fall back to raw merged (initial load before any shuffle)
    return this.rawMergedSongs();
  });

  // Effect: watch merged list & activation status; schedule sync when it changes
  private readonly watchEffect = effect(() => {
    if (!this.isActive()) return; // inert if not active
  const list = this.rawMergedSongs();
    // --- Platform selection transition logging (one-time) ----------------------
    const platformsNow = this.currentPlatforms();
    const countNow = platformsNow.length;
    if (!this.firstPlatformLogged && countNow === 1) {
      const p = platformsNow[0];
      const plId = p === 'youtube' ? this.yt.selectedPlaylist()?.id : this.sp.selectedPlaylist()?.id;
      console.log('[OmniPlay] first platform selected', { platform: p, playlistId: plId });
      this.firstPlatformLogged = true;
    }
    if (!this.secondPlatformLogged && countNow === 2) {
      console.log('[OmniPlay] second platform selected – both present', {
        platforms: platformsNow,
        youtubePlaylistId: this.yt.selectedPlaylist()?.id,
        spotifyPlaylistId: this.sp.selectedPlaylist()?.id,
      });
      this.secondPlatformLogged = true;
    }
    this.prevPlatformCount = countNow; // retained for potential future logic
    // --------------------------------------------------------------------------
  // Always schedule; internal logic determines if commit is needed.
  this.scheduleSync();
  });

  /** Public method kept for backward compatibility; now just schedules a sync. */
  recomputeAndSync(): void { this.scheduleSync(); }

  /** Explicit external trigger to force a fresh reshuffle on next sync. */
  forceReshuffle(): void {
    console.log('[OmniPlay] forceReshuffle() called');
    this.reshuffleRequested = true;
    this.scheduleSync();
  }

 
  // ── Internal helpers ─────────────────────────────────────────────────────
  // (Legacy buildSignature unused now) retained only if debugging is needed
  private buildSignature(list: Song[]): string { return list.map(s => `${s.platform}:${s.id}`).join('|'); }

  private preserveCurrentTrackId(next: Song[]): string | undefined {
    try {
      const cur = this.instance.track?.(); // PlaylistInstanceService.track()
      if (!cur) return undefined;
      const id = cur.id;
      const platform = (cur as any).platform;
      if (!id || !platform) return undefined;
      return next.some(s => s.id === id && (s as any).platform === platform) ? id : undefined;
    } catch { return undefined; }
  }

  private scheduleSync(): void {
    if (!this._active()) return;
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null;
  this.runSync();
    }, 25); // small debounce to coalesce platform updates
  }

  // scheduleImmediate no longer needed (removed)

  // Core sync logic (previously inside recomputeAndSync)
  private runSync(): void {
    if (this.pendingSync || !this._active()) return;
    this.pendingSync = true;
    try {
  const merged = this.rawMergedSongs();
      if (!merged.length) return;
      const platforms = Array.from(new Set(merged.map(s => s.platform)));
      // Allow single-platform mode (for testing and unified behavior)
      if (platforms.length < 1) return; // need at least one platform

      const ytPlId = this.yt.selectedPlaylist()?.id || null;
      const spPlId = this.sp.selectedPlaylist()?.id || null;

      // Playlist change detection -> request reshuffle
      const playlistChanged = (
        (this.lastYtPlaylistIdCommitted && ytPlId && this.lastYtPlaylistIdCommitted !== ytPlId) ||
        (this.lastSpPlaylistIdCommitted && spPlId && this.lastSpPlaylistIdCommitted !== spPlId)
      );
      if (playlistChanged) {
        console.log('[OmniPlay] playlist change detected -> reshuffle request', { ytPlId, spPlId });
        this.reshuffleRequested = true;
        this.lastPlaylistChangeAt = Date.now();
        this.postChangeReshuffleDone = false; // reset secondary reshuffle guard
      }

      // Platform growth trigger
      if (platforms.length > this.prevCommittedPlatformCount && this.prevCommittedPlatformCount > 0) {
        console.log('[OmniPlay] platform count increased -> reshuffle request', { newCount: platforms.length, prev: this.prevCommittedPlatformCount });
        this.reshuffleRequested = true;
      }

      // Membership signature (order-insensitive)
      const keys = merged.map(s => `${(s as any).platform}:${s.id}`);
      const sortedKeys = [...keys].sort();
      const currentMembershipSig = sortedKeys.join('|');
      const membershipChanged = currentMembershipSig !== this.membershipSignature;

      const needInitial = !this.initialMultiCommitDone;
      const needFullReshuffle = needInitial || this.reshuffleRequested;

      // Variable to hold the final ordered list
      let ordered: Song[];

      if (needFullReshuffle) {
        console.log('[OmniPlay] full reshuffle start', {
          reason: {
            initial: !this.initialMultiCommitDone,
            requested: this.reshuffleRequested,
            playlistChanged,
            platformGrowth: platforms.length > this.prevCommittedPlatformCount && this.prevCommittedPlatformCount > 0
          },
          previousOrderSig: this.lastOrderedSignature || '(none)'
        });

        // Shuffle the merged array
        let attempts = 0;
        let shuffled: Song[] = [];
        let newOrderSig = '';
        do {
          shuffled = this.shuffle(merged.slice());
          newOrderSig = shuffled.map(s => `${(s as any).platform}:${s.id}`).join('>');
          attempts++;
          if (newOrderSig !== this.lastOrderedSignature || attempts >= 5) break;
        } while (true);

        // Assign sequential indices 0→N to the shuffled array
        this.orderMap.clear();
        this.nextOrderIndex = 0;
        shuffled.forEach((song, idx) => {
          const k = `${(song as any).platform}:${song.id}`;
          this.orderMap.set(k, idx);  // Use idx directly (0, 1, 2, 3...)
        });
        this.nextOrderIndex = shuffled.length; // Track next available index

        // Use shuffled array directly - it's already in order 0→N!
        ordered = shuffled;

        this.initialMultiCommitDone = true;
        this.reshuffleRequested = false;
        this.membershipSignature = currentMembershipSig;
        // Don't set lastOrderedSignature yet - let the commit phase handle it
        const orderPreview = ordered.map((s, idx) => `[${idx}] ${(s as any).platform}:${s.id}`).slice(0, 5);
        console.log('[OmniPlay] full reshuffle applied', {
          attempts,
          size: ordered.length,
          orderPreview,
          fullOrder: ordered.map(s => s.name || s.id),
          newOrderSig
        });
      } else if (membershipChanged) {
        const withinGrace = (Date.now() - this.lastPlaylistChangeAt) < this.playlistChangeGraceMs;
        if (withinGrace && !this.postChangeReshuffleDone) {
          // Perform a second-phase reshuffle because tracks finished loading after playlist id change.
          console.log('[OmniPlay] second-phase reshuffle (post playlist load)', {
            msSinceChange: Date.now() - this.lastPlaylistChangeAt,
            previousOrderSig: this.lastOrderedSignature || '(none)'
          });

          const shuffled = this.shuffle(merged.slice());
          this.orderMap.clear();
          this.nextOrderIndex = 0;
          shuffled.forEach((song, idx) => {
            const k = `${(song as any).platform}:${song.id}`;
            this.orderMap.set(k, idx);
          });
          this.nextOrderIndex = shuffled.length;

          // Use shuffled array directly
          ordered = shuffled;
          // Don't set lastOrderedSignature yet - let the commit phase handle it

          this.membershipSignature = currentMembershipSig;
          this.postChangeReshuffleDone = true;
          console.log('[OmniPlay] second-phase reshuffle applied', { size: ordered.length });
        } else {
          // Incremental diff: prune removed, append new (no reshuffle)
          const currentSet = new Set(sortedKeys);
          for (const existing of Array.from(this.orderMap.keys())) {
            if (!currentSet.has(existing)) this.orderMap.delete(existing);
          }
          for (const k of sortedKeys) {
            if (!this.orderMap.has(k)) this.orderMap.set(k, this.nextOrderIndex++);
          }
          this.membershipSignature = currentMembershipSig;

          // Sort by orderMap to maintain existing order with new songs appended
          ordered = merged.slice().sort((a, b) => {
            const ka = `${(a as any).platform}:${a.id}`;
            const kb = `${(b as any).platform}:${b.id}`;
            return (this.orderMap.get(ka)! - this.orderMap.get(kb)!);
          });
          // Don't set lastOrderedSignature yet - let the commit phase handle it

          console.log('[OmniPlay] membership-only update (no reshuffle)', {
            size: merged.length,
            withinGrace,
            postChangeReshuffleDone: this.postChangeReshuffleDone
          });
        }
      } else {
        // No changes needed, but we still need to produce ordered list from orderMap
        ordered = merged.slice().sort((a, b) => {
          const ka = `${(a as any).platform}:${a.id}`;
          const kb = `${(b as any).platform}:${b.id}`;
          return (this.orderMap.get(ka)! - this.orderMap.get(kb)!);
        });
      }

      // Check if the order actually changed
      const orderSig = ordered.map(s => `${(s as any).platform}:${s.id}`).join('>');
      if (orderSig === this.lastOrderedSignature) {
        console.log('[OmniPlay] no change in order - skipping update');
        return; // no visible change
      }

      // Update the signature BEFORE publishing to UI
      this.lastOrderedSignature = orderSig;

      // Publish ordered list for UI (before commit so UI reflect same order)
      this.orderedListSig.set(ordered);
      console.log('[OmniPlay] UI signal updated with', ordered.length, 'songs');

      const preservedId = this.preserveCurrentTrackId(ordered);
      this.commit(ordered, preservedId, { ytPlId, spPlId, shuffled: needFullReshuffle });
      this.prevCommittedPlatformCount = platforms.length;
    } finally {
      this.pendingSync = false;
    }
  }

  private commit(list: Song[], preservedId?: string, playlistIds?: { ytPlId: string | null; spPlId: string | null; shuffled?: boolean }): void {
    queueMicrotask(() => {
      try { this.instance.syncPlaylist(list, preservedId); } catch {}
      const platforms = new Set(list.map(s => (s as any).platform));
      if (platforms.size > 1) {
        console.log('[OmniPlay] multi-platform instance (order persisted)', {
          size: list.length,
          preservedId,
          order: list.map(s => `${(s as any).platform}:${s.id}`),
          ytPlaylistId: playlistIds?.ytPlId ?? null,
          spotifyPlaylistId: playlistIds?.spPlId ?? null,
          reshuffled: !!playlistIds?.shuffled
        });
        if (playlistIds) {
          this.lastYtPlaylistIdCommitted = playlistIds.ytPlId;
            this.lastSpPlaylistIdCommitted = playlistIds.spPlId;
        }
      }
    });
  }

  private shuffle(arr: Song[]): Song[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private clearTimers(): void {
    if (this.debounceHandle) { clearTimeout(this.debounceHandle); this.debounceHandle = null; }
    this.pendingSync = false;
  }

  // Helper to enumerate currently selected platforms (used for logging transitions)
  private currentPlatforms(): ('youtube' | 'spotify')[] {
    const arr: ('youtube' | 'spotify')[] = [];
    try { if (this.yt.selectedPlaylist()) arr.push('youtube'); } catch {}
    try { if (this.sp.selectedPlaylist()) arr.push('spotify'); } catch {}
    return arr;
  }
}

import { Injectable, inject, computed, effect, signal } from '@angular/core';
import { formatTime } from '../../shared/utils/time-format.util';
import { PlaybackStateStore } from './playback-state.store';
import { PlayListLogicService } from '../../features/music-player/services/play-list-logic.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { Song } from '../../shared/models/song.model';


@Injectable({ providedIn: 'root' })
export class PlaylistInstanceService {
  private readonly state = inject(PlaybackStateStore);
  private readonly logic = inject(PlayListLogicService);
  private readonly registry = inject(AdapterRegistryService);
  private isTransitioning = false; // reentrancy guard for next/prev atomic transitions
  // Simple local volume state (0..1), shared to UI
  private volumeSig = signal(1.0);
  private lastNonZeroVolSig = signal(1.0);
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
    // Passive observer only; skip while an explicit transition is orchestrating adapter calls
    if (this.isTransitioning) return;
    // If the selected track's platform differs from current platformKind, switch first
    const trackPlatform = (track as any).platform;
    if (trackPlatform && trackPlatform !== kind) {
      // Pause the currently active adapter before switching to avoid dual playback
      try {
        const oldAdapter = adapter; // adapter corresponds to old kind
        oldAdapter?.pause?.();
      } catch {}
      // Update platform sync so activeAdapter recomputes to new adapter
      try { this.state.setPlatformKind(trackPlatform); } catch {}
  // Defer rest of handling until effect re-runs with new adapter
  return;
    }
    // Normalize ID (notably for Spotify raw IDs) for comparison only
    let incomingId = track.id || track.uri || null;
    if (kind === 'spotify' && incomingId && !String(incomingId).startsWith('spotify:track:')) {
      incomingId = `spotify:track:${incomingId}`;
    }
    const currentId = adapter.currentIdOrUri?.() || null;
    console.log('[select-effect]', {
  kind,
  incomingId,
  currentId,
  hasAdapter: !!adapter,
  playerReady: adapter?.isReady?.()
});
    // No direct adapter.load()/resume() here; atomic transitions handle that.
  });

  // Secondary effect to catch platform kind switches and ensure autoplay resumes promptly in omniplay or cross-platform sequences
  private readonly postPlatformSwitchEffect = effect(() => {
    const kind = this.state.platformKind();
    if (!kind) return;
    const adapter: any = this.activeAdapter();
    const track: any = this.state.currentTrack();
    if (!adapter || !track) return;
    // If we are marked playing but adapter not actually playing (resume gap after platform swap), attempt start/resume.
    if (this.state.isPlaying()) {
      try {
        if (adapter.isReady?.()) {
          // Prefer resume, fallback to start
          if (adapter.resume) adapter.resume(); else adapter.start?.();
        }
      } catch {}
    }
  });

  // ---- Read API (signals mirror) ----
  readonly isReady       = () => this.state.isReady();
  readonly isPlaying     = () => this.state.isPlaying();
  readonly duration      = () => this.state.duration();
  readonly current       = () => this.state.currentTime();
  readonly volume        = () => this.volumeSig();
  // Formatted (non-breaking: new getters)
  readonly durationFmt   = () => formatTime(this.state.duration());
  readonly currentTimeFmt= () => formatTime(this.state.currentTime());
  readonly track         = () => this.state.currentTrack();
  readonly kind          = () => this.state.platformKind();

  // Optional convenience
  readonly tracks        = () => this.logic.items();
  readonly index         = () => this.logic.index(); // if you already expose it; otherwise omit

  // ---- Write API / Commands ----
  async selectTrack(song: Song) {
    // Use atomic transition so manual selection autoplays just like next/prev
    // Avoid overlapping if already transitioning; queue simple state set as fallback
    if (this.isTransitioning) { this.state.setCurrentTrack(song); return; }
    await this.transitionToSong(song, true);
  }
  setPlatform(kind: 'youtube' | 'spotify' | 'soundcloud') {
  this.state.setPlatformKind(kind as any);
}

  // Transport controls implemented locally
  play(): void {
    if (this.state.isPlaying()) return;
    this.activeAdapter()?.start?.();
    // Adapter will flip playing true once confirmed
  }

  pause(): void {
    if (!this.state.isPlaying()) return;
    this.activeAdapter()?.pause?.();
    this.state.setPlaying(false);
  }

  toggle(): void {
    const isPlaying = this.state.isPlaying();
    const duration = this.state.duration();
    const position = this.state.currentTime();
    if (isPlaying) {
      this.pause();
    } else if (duration > 0 && position > 0) {
      // treat as resume; adapter will confirm playing state
      this.activeAdapter()?.resume?.();
    } else {
      this.play();
    }
  }

  // ---- Volume controls ----
  setVolume(value: number): void {
    const v = Math.max(0, Math.min(1, value ?? 0));
    try { this.activeAdapter()?.setVolume?.(v); } catch {}
    this.volumeSig.set(v);
    if (v > 0) this.lastNonZeroVolSig.set(v);
  }

  toggleMute(): void {
    const adapter: any = this.activeAdapter?.();
    const currentVol = this.volumeSig();
    let isMuted: boolean | null = null;
    try { isMuted = adapter?.isMuted?.() ?? null; } catch { isMuted = null; }

    // Determine muted state (prefer adapter's, fallback to volumeSig)
    const muted = isMuted === null ? currentVol === 0 : isMuted;

    if (muted) {
      // Unmute: call adapter-specific unmute if available, then restore volume
      const target = this.lastNonZeroVolSig() || 1.0;
      try { adapter?.unmute?.(); } catch {}
      try { adapter?.setVolume?.(target); } catch {}
      this.volumeSig.set(target);
    } else {
      // Mute
      try { adapter?.mute?.(); } catch {}
      this.volumeSig.set(0);
    }
  }

  async next(): Promise<void> {
    const song = this.logic.next(false);
    if (!song) return;
    await this.transitionToSong(song, true);
  }

  async prev(): Promise<void> { // keep name 'prev' to match template usage
    const song = this.logic.previous(false);
    if (!song) return;
    await this.transitionToSong(song, true);
  }

  /** Atomic platform‑agnostic transition: stop old -> switch platform -> set state -> load -> autoplay */
  private async transitionToSong(next: Song, autoplay = true): Promise<void> {
    if (this.isTransitioning) return; // drop overlapping rapid clicks
    this.isTransitioning = true;
    const startTs = performance.now?.() || Date.now();
    try {
      const currentAdapter: any = this.activeAdapter?.();
      try {
        // Stop current playback (best effort)
        await currentAdapter?.pause?.();
        await currentAdapter?.stop?.(); // may be undefined; safe optional
      } catch {}

      // Determine target platform
      const platform: any = (next as any).platform;
      if (platform && platform !== this.state.platformKind()) {
        this.state.setPlatformKind(platform);
      }

      // Commit selection & intent (do not mark playing yet; wait for adapter confirm)
      this.state.setCurrentTrack(next);
      if (!autoplay) this.state.setPlaying(false);

      // Resolve adapter AFTER potential platformKind switch
      const targetAdapter: any = (this.registry as any).getAdapterFor?.(platform) || this.activeAdapter?.();
      try {
        await targetAdapter?.load?.(next);
        if (autoplay) {
          if (typeof targetAdapter?.play === 'function') {
            await targetAdapter.play();
          } else if (typeof targetAdapter?.resume === 'function') {
            await targetAdapter.resume();
          } else if (typeof targetAdapter?.start === 'function') {
            await targetAdapter.start();
          }
        }
      } catch {}
      // If adapter wasn't ready yet (e.g., first YouTube attach), schedule a deferred retry to load+autoplay once ready
      try {
        if (autoplay && !(targetAdapter?.isReady?.())) {
          const intended = next;
          let attempts = 0;
          const maxAttempts = 20; // ~3s @150ms
          const retry = () => {
            try {
              if (targetAdapter?.isReady?.()) {
                targetAdapter?.load?.(intended);
                if (typeof targetAdapter?.play === 'function') targetAdapter.play();
                else if (typeof targetAdapter?.resume === 'function') targetAdapter.resume();
                else if (typeof targetAdapter?.start === 'function') targetAdapter.start();
              } else if (attempts++ < maxAttempts) {
                setTimeout(retry, 150);
              }
            } catch {}
          };
          setTimeout(retry, 150);
        }
      } catch {}
      // Breadcrumb
      try { console.debug('[PlaylistTransition] success', { id: (next as any).id, platform, dt: (performance.now?.() || Date.now()) - startTs }); } catch {}
    } finally {
      this.isTransitioning = false;
    }
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

import { Injectable, inject, signal, effect, DestroyRef } from '@angular/core';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';
import { AdapterRegistryService } from '../../../core/playback/adapter-registry.service';
import { PlatformKind } from '../../../core/playback/player-port';
import { formatTime } from '../../../shared/utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  //==================================================
  // SECTION: Dependency Injection (Shared)
  //==================================================
  private readonly musicPlayer = inject(PlaybackStateStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adapterRegistry = inject(AdapterRegistryService);
  private lastAdapterKind: PlatformKind | null = null; // tracks currently active adapter kind

  // High-resolution clock helper (performance.now fallback safe for tests / SSR)
  private readonly now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  //==================================================
  // SECTION: Shared Timer & Clock State
  //==================================================
  private readonly timerTick = signal<number>(0); // generic tick for polling adapter state
  private timerInterval: number | null = null;

  //==================================================
  // (Removed platform-specific YouTube & Spotify state — now delegated to adapters)

  // Effect: Monitor track platform changes to teardown previous adapter when switching platforms.
  private readonly platformSwitchEffect = effect(() => {
  const track = this.musicPlayer.currentTrack();
  const newKind: PlatformKind | null = (track?.platform as PlatformKind) || null;
    if (!newKind) return; // ignore tracks without a recognized platform
    if (this.lastAdapterKind && this.lastAdapterKind !== newKind) {
      const oldAdapter = this.adapterRegistry.get(this.lastAdapterKind);
      if (oldAdapter && typeof oldAdapter.teardown === 'function') {
        try { oldAdapter.teardown(); } catch (e) { console.warn('Adapter teardown error:', e); }
      }
    }
    this.lastAdapterKind = newKind; // update after teardown logic
  });

  //==================================================
  // SECTION: Derived UI Signals (Cross-platform)
  //==================================================
  // Adapted derived signals: poll adapter snapshots only.
  readonly currentProgress = signal(0);
  readonly currentTime = signal('0:00');
  readonly duration = signal('0:00');

  private readonly pollEffect = effect(() => {
    this.timerTick();
    const track = this.musicPlayer.currentTrack();
    if (!track) { this.currentProgress.set(0); this.currentTime.set('0:00'); this.duration.set('0:00'); return; }
    const adapter = this.adapterRegistry.get(track.platform as PlatformKind);
    if (!adapter) return;
  const durRaw = adapter.durationSeconds();
  const curRaw = adapter.currentTimeSeconds();
  const dur = (typeof durRaw === 'number' && durRaw > 0) ? durRaw : 0;
  const cur = (typeof curRaw === 'number' && curRaw >= 0) ? curRaw : 0;
  if (dur > 0) this.currentProgress.set((cur / dur) * 100); else this.currentProgress.set(0);
  this.currentTime.set(formatTime(cur));
  this.duration.set(formatTime(dur));
  });

  //==================================================
  // SECTION: Playback Control (Cross-platform)
  //==================================================
  async toggle(): Promise<void> {
    const track = this.musicPlayer.currentTrack();
    if (!track) return;
    const adapter = this.adapterRegistry.get(track.platform as PlatformKind);
    if (!adapter) return;
    try {
      if (adapter.isPlaying()) {
        await adapter.pause();
        this.musicPlayer.setPlayingState(false);
        return;
      }
      const identifier = (track as any).id || (track as any).video_url || (track as any).uri;
      const currentIdGetter = (adapter as any).currentIdOrUri?.();
      if (!currentIdGetter || (identifier && currentIdGetter !== identifier)) {
        await adapter.load(track);
      }
      await adapter.start(track);
      this.musicPlayer.setPlayingState(true);
    } catch (e) {
      console.warn('toggle failed', e);
    }
  }

  async seekPercent(percent: number): Promise<void> {
    const track = this.musicPlayer.currentTrack();
    if (!track) return;
    const adapter = this.adapterRegistry.get(track.platform as PlatformKind);
    if (!adapter) return;
    const clamped = Math.max(0, Math.min(100, percent));
    const durRaw = adapter.durationSeconds();
    const dur = (typeof durRaw === 'number' && durRaw > 0) ? durRaw : 0;
    if (!dur) return;
    const targetSeconds = (clamped / 100) * dur;
    try {
      if (typeof (adapter as any).seekTo === 'function') await (adapter as any).seekTo(targetSeconds);
      else if (typeof (adapter as any).seek === 'function') await (adapter as any).seek(targetSeconds);
    } catch (e) { console.warn('seek failed', e); }
  }

  //==================================================
  // SECTION: Timer Management (Shared Infrastructure)
  //==================================================
  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;
    this.timerInterval = window.setInterval(() => {
      this.timerTick.update(t => t + 1);
    }, 500);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private stopTimer(): void {
    if (!this.timerInterval) return;
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
}

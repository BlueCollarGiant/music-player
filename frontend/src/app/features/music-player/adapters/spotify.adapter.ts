import { Injectable, signal, effect, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { SpotifyPlaybackService } from '../services/spotify-playback.service';

/**
 * SpotifyAdapter
 * Single authoritative adapter bridging the unified PlayerPort API with the
 * underlying SpotifyPlaybackService. Provides lightweight state snapshot
 * methods and extrapolates current position between SDK updates for smoother UI.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyAdapter implements PlayerPort {
  readonly kind = 'spotify' as const;              // Preferred identifier
  readonly platform = 'spotify' as const;          // Back-compat (legacy code)

  private readonly playback = inject(SpotifyPlaybackService);

  // Internal extrapolation state
  private basePositionMs = signal(0);              // Last progressMs received
  private lastUpdateTs = signal(0);                // High-res timestamp when base captured
  private durationMsSig = signal(0);               // Track duration (ms)
  private trackUri: string | null = null;          // Current track URI
  private playingSig = signal(false);              // Cached playing state

  constructor() { this.bindPlaybackSignals(); }

  // Bind service reactive signals once (no duplicate effects)
  private bindPlaybackSignals(): void {
    effect(() => {
      const track: any = this.playback.track(); // cast for now (service exposes loosely typed meta)
      const progressMs = this.playback.progressMs();
      const durationMs = this.playback.durationMs();
      const isPlaying = this.playback.isPlaying();
      const uri = track?.uri || null;

      if (uri && uri !== this.trackUri) {
        this.trackUri = uri;
        this.basePositionMs.set(0);
        this.lastUpdateTs.set(performance.now());
  this.durationMsSig.set(durationMs || track?.durationMs || 0);
      }
      if (typeof progressMs === 'number') {
        this.basePositionMs.set(progressMs);
        this.lastUpdateTs.set(performance.now());
      }
      if (durationMs) this.durationMsSig.set(durationMs);
      this.playingSig.set(!!isPlaying);
    });
  }

  // Compute optimistic current position (ms) based on last known progress + elapsed time
  private computePositionMs(): number {
    const duration = this.durationMsSig();
    if (!duration) return 0;
    let pos = this.basePositionMs();
    if (this.playingSig()) pos += performance.now() - this.lastUpdateTs();
    return Math.min(Math.max(pos, 0), duration);
  }

  // --- PlayerPort snapshot methods ---
  isReady(): boolean { return this.playback.ready(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { return Math.floor(this.durationMsSig() / 1000); }
  currentTimeSeconds(): number { return Math.floor(this.computePositionMs() / 1000); }
  currentIdOrUri(): string | null { return this.trackUri; }

  // --- Control methods ---
  async load(track: any): Promise<void> {
    // Allow string track id for legacy callers
    const payload = typeof track === 'string' ? { id: track } : track;
    await this.playback.load(payload).catch(() => {});
  }
  async start(): Promise<void> { await this.playback.start().catch(() => {}); }
  async pause(): Promise<void> { await this.playback.pause().catch(() => {}); }
  async playOrResume(): Promise<void> { await this.playback.resume().catch(() => {}); }
  async resume(): Promise<void> { return this.playOrResume(); } // alias
  async seekTo(seconds: number): Promise<void> { await this.playback.seek(seconds).catch(() => {}); }
  async seek(seconds: number): Promise<void> { return this.seekTo(seconds); }  // alias
  async teardown(): Promise<void> { await this.playback.teardown().catch(() => {}); }
}

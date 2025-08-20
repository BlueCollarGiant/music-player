import { Injectable, signal, effect, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { SpotifyPlaybackService } from '../services/spotify-playback.service';

/**
 * SpotifyAdapter — authoritative adapter bridging PlayerPort to SpotifyPlaybackService.
 * - Snapshots derived from SDK state; currentTime extrapolated between pushes.
 * - Returns 0 (not null) for unknown durations/positions to simplify math.
 * - Includes back-compat aliases so old call sites don’t break.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyAdapter implements PlayerPort {
  readonly kind = 'spotify' as const;
  /** @deprecated Prefer `kind`; kept only while migrating old reads */
  readonly platform = 'spotify' as const;

  private readonly playback = inject(SpotifyPlaybackService);

  // Extrapolation state (ms)
  private basePositionMs = signal(0);
  private lastUpdateTs = signal(0);
  private durationMsSig = signal(0);
  private trackUri: string | null = null;
  private playingSig = signal(false);

  constructor() {
    this.bindPlaybackSignals();
  }

  // Keep a single effect that mirrors service signals into adapter snapshots.
  private bindPlaybackSignals(): void {
    effect(() => {
      const track: any = this.playback.track();          // loose meta for now
      const progressMs = this.playback.progressMs();     // number | undefined
      const durationMs = this.playback.durationMs();     // number | undefined
      const isPlaying = this.playback.isPlaying();       // boolean | undefined
      const uri = track?.uri || null;

      // Track change: reset extrapolation base & update duration
      if (uri && uri !== this.trackUri) {
        this.trackUri = uri;
        this.basePositionMs.set(0);
        this.lastUpdateTs.set(nowTs());
        this.durationMsSig.set(durationMs ?? track?.durationMs ?? 0);
      }

      // Fresh progress snapshot
      if (typeof progressMs === 'number') {
        this.basePositionMs.set(progressMs);
        this.lastUpdateTs.set(nowTs());
      }

      // Duration / playing
      if (typeof durationMs === 'number') this.durationMsSig.set(durationMs);
      this.playingSig.set(!!isPlaying);
    });
  }

  // Extrapolate current position (ms) using time since last SDK tick
  private computePositionMs(): number {
    const duration = this.durationMsSig();
    if (!duration) return 0;
    let pos = this.basePositionMs();
    if (this.playingSig()) pos += Math.max(0, nowTs() - this.lastUpdateTs());
    return clamp(pos, 0, duration);
  }

  // ── PlayerPort snapshots ─────────────────────────────────────────────────────
  isReady(): boolean { return this.playback.ready(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { return msToSec(this.durationMsSig()); }
  currentTimeSeconds(): number { return msToSec(this.computePositionMs()); }
  currentIdOrUri(): string | null { return this.trackUri; }

  // ── Controls ────────────────────────────────────────────────────────────────
  async load(track: unknown): Promise<void> {
    // Allow string id/uri for legacy callers
    const payload = typeof track === 'string' ? { id: track } : track as any;
    await this.playback.load(payload).catch(noop);
  }
  async start(): Promise<void> { await this.playback.start().catch(noop); }
  async pause(): Promise<void> { await this.playback.pause().catch(noop); }
  async resume(): Promise<void> { await this.playback.resume().catch(noop); }
  async seek(seconds: number): Promise<void> { await this.playback.seek(seconds).catch(noop); }
  async teardown(): Promise<void> { await this.playback.teardown().catch(noop); }

  // ── Back-compat aliases (safe to remove once call sites are migrated) ───────
  async playOrResume(): Promise<void> { return this.resume(); }
  async seekTo(seconds: number): Promise<void> { return this.seek(seconds); }
}

// ── helpers ───────────────────────────────────────────────────────────────────
function nowTs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
function msToSec(ms: number): number { return Math.floor((ms || 0) / 1000); }
function clamp(n: number, min: number, max: number): number { return Math.min(Math.max(n, min), max); }
function noop() {}
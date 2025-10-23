import { Injectable, signal } from '@angular/core';

/**
 * Single Responsibility: Manage all Spotify adapter state signals
 *
 * This service is responsible for tracking the current state of the Spotify player,
 * including playback status, position, duration, track info, and volume/mute state.
 */
@Injectable()
export class SpotifyStateManager {
  // Player readiness
  readonly ready = signal(false);

  // Playback state
  readonly playing = signal(false);
  readonly durationMs = signal(0);
  readonly basePositionMs = signal(0);
  readonly lastUpdateTs = signal(0);
  readonly trackUri = signal<string | null>(null);

  // Volume state (SDK doesn't track mute, so we do)
  readonly muted = signal(false);
  private lastVolume = 1.0;

  // ── Setters ──────────────────────────────────────────────────────────────
  setReady(ready: boolean): void {
    this.ready.set(ready);
  }

  setPlaying(playing: boolean): void {
    this.playing.set(playing);
  }

  setDurationMs(ms: number): void {
    this.durationMs.set(Math.max(0, ms));
  }

  setBasePositionMs(ms: number): void {
    this.basePositionMs.set(Math.max(0, ms));
  }

  setLastUpdateTs(ts: number): void {
    this.lastUpdateTs.set(ts);
  }

  setTrackUri(uri: string | null): void {
    this.trackUri.set(uri);
  }

  setMuted(muted: boolean): void {
    this.muted.set(muted);
  }

  setLastVolume(volume: number): void {
    if (volume > 0) {
      this.lastVolume = volume;
    }
  }

  getLastVolume(): number {
    return this.lastVolume;
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  reset(): void {
    this.ready.set(false);
    this.playing.set(false);
    this.durationMs.set(0);
    this.basePositionMs.set(0);
    this.lastUpdateTs.set(0);
    this.trackUri.set(null);
    this.muted.set(false);
  }
}

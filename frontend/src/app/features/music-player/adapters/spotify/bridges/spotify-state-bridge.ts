import { Injectable, effect } from '@angular/core';
import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { SpotifyStateManager } from '../state/spotify-state-manager';
import { SpotifyPositionExtrapolator } from '../state/spotify-position-extrapolator';

/**
 * Single Responsibility: Bridge Spotify adapter state to global PlaybackStateStore
 *
 * This service is responsible for keeping the global playback state store
 * synchronized with the Spotify adapter's local state using Angular effects.
 */
@Injectable()
export class SpotifyStateBridge {
  constructor(
    private stateManager: SpotifyStateManager,
    private extrapolator: SpotifyPositionExtrapolator,
    private globalStore: PlaybackStateStore
  ) {
    this.setupSyncEffects();
  }

  /**
   * Set up reactive effects to sync state to global store
   */
  private setupSyncEffects(): void {
    // Sync playing state
    effect(() => {
      this.globalStore.setPlaying(this.stateManager.playing());
    });

    // Sync duration (convert ms to seconds)
    effect(() => {
      const durationMs = this.stateManager.durationMs();
      this.globalStore.setDuration(this.msToSec(durationMs));
    });

    // Note: Position is synced via timer callback in extrapolator.startTimer()
    // to avoid creating an effect that runs every second
  }

  /**
   * Update global store with current position (called from position timer)
   */
  updatePosition(seconds: number): void {
    this.globalStore.setCurrentTime(seconds);
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private msToSec(ms: number): number {
    return Math.floor((ms || 0) / 1000);
  }
}

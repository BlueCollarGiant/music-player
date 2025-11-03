import { Injectable, effect } from '@angular/core';
import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { SpotifyStateManager } from '../state/spotify-state-manager';
import { SpotifyPositionExtrapolator } from '../state/spotify-position-extrapolator';

// ═══════════════════════════════════════════════════════════════════════════
// Spotify State Bridge
// ═══════════════════════════════════════════════════════════════════════════
//
// Bridges Spotify adapter state to the global PlaybackStateStore.
//
// Single Responsibility:
// Maintains synchronization between the Spotify adapter's local state and the
// application-wide playback state store using Angular's reactive effects system.
//
// Architecture Role:
// Acts as a bridge component in the Adapter pattern, ensuring that Spotify-specific
// state changes are propagated to the global playback state without coupling the
// adapter directly to the global store.
//
// State Synchronization Strategy:
// - Playing state: Synchronized via Angular effect (immediate updates)
// - Duration: Synchronized via Angular effect with ms-to-seconds conversion
// - Position: Synchronized via timer callback to optimize performance and avoid
//   creating effects that trigger every second
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class SpotifyStateBridge {

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor & Initialization
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private stateManager: SpotifyStateManager,
    private extrapolator: SpotifyPositionExtrapolator,
    private globalStore: PlaybackStateStore
  ) {
    this.setupSyncEffects();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  // ─────
  // Updates the global store with the current playback position.
  // This method is called by the position extrapolator's timer callback to
  // update the position without creating a reactive effect that would trigger every second.
  // ─────
  updatePosition(seconds: number): void {
    this.globalStore.setCurrentTime(seconds);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation - Effect Setup
  // ─────────────────────────────────────────────────────────────────────────

  // Establishes reactive effects to automatically sync state changes from
  // the Spotify state manager to the global playback state store.
  // Effects are registered during construction and will automatically track
  // signal dependencies and re-run when those signals change.
  private setupSyncEffects(): void {
    this.syncPlayingState();
    this.syncDuration();
  }

  // Syncs the playing/paused state from Spotify state manager to global store.
  // Creates an effect that reactively updates the global playing state whenever
  // the Spotify adapter's playing state changes.
  private syncPlayingState(): void {
    effect(() => {
      const isPlaying = this.stateManager.playing();
      this.globalStore.setPlaying(isPlaying);
    });
  }

  // Syncs the track duration from Spotify state manager to global store.
  // Creates an effect that reactively updates the global duration, converting
  // from Spotify's millisecond format to the application's second format.
  private syncDuration(): void {
    effect(() => {
      const durationMs = this.stateManager.durationMs();
      const durationSeconds = this.msToSec(durationMs);
      this.globalStore.setDuration(durationSeconds);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers - Utility Functions
  // ─────────────────────────────────────────────────────────────────────────

  // Converts milliseconds to seconds, rounding down to the nearest integer.
  // Spotify's API returns durations and positions in milliseconds, but the
  // global playback store uses seconds for consistency with HTML5 audio/video.
  private msToSec(ms: number): number {
    return Math.floor((ms || 0) / 1000);
  }
}

import { Injectable } from '@angular/core';
import { SpotifyStateManager } from './spotify-state-manager';

/**
 * Single Responsibility: Calculate current playback position with extrapolation
 *
 * This service handles the logic for extrapolating the current playback position
 * based on the last known position, the playing state, and elapsed time.
 * It also manages the interval timer for periodic position updates.
 */
@Injectable()
export class SpotifyPositionExtrapolator {
  private positionTimer: any = null;

  constructor(private stateManager: SpotifyStateManager) {}

  /**
   * Compute current position in milliseconds with extrapolation.
   * If playing, adds elapsed time since last update.
   */
  computePositionMs(): number {
    const dur = this.stateManager.durationMs();
    if (!dur) return 0;

    let pos = this.stateManager.basePositionMs();
    if (this.stateManager.playing()) {
      const elapsed = Math.max(0, this.nowTs() - this.stateManager.lastUpdateTs());
      pos += elapsed;
    }

    return this.clamp(pos, 0, dur);
  }

  /**
   * Compute current position in seconds (convenience method)
   */
  computePositionSeconds(): number {
    return this.msToSec(this.computePositionMs());
  }

  /**
   * Start interval timer to update position (callback receives seconds)
   */
  startTimer(onUpdate: (seconds: number) => void): void {
    if (this.positionTimer || typeof window === 'undefined') return;

    this.positionTimer = window.setInterval(() => {
      try {
        if (this.stateManager.playing()) {
          const posSec = this.computePositionSeconds();
          onUpdate(posSec);
        }
      } catch (e) {
        console.warn('[SpotifyPositionExtrapolator] Timer update failed', e);
      }
    }, 1000);
  }

  /**
   * Stop and clear the position timer
   */
  stopTimer(): void {
    if (this.positionTimer) {
      try {
        clearInterval(this.positionTimer);
      } catch {}
      this.positionTimer = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private nowTs(): number {
    return typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
  }

  private msToSec(ms: number): number {
    return Math.floor((ms || 0) / 1000);
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }
}

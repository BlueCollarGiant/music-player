import { Injectable, DestroyRef, inject } from '@angular/core';
import { YouTubeStateManager } from './youtube-state-manager';

type YouTubePlayer = any;

/**
 * Single Responsibility: Track YouTube playback position with timer
 *
 * Unlike Spotify (which uses extrapolation), YouTube provides getCurrentTime()
 * directly from the IFrame API. This service polls the player every 500ms.
 */
@Injectable()
export class YouTubePositionTracker {
  private destroyRef = inject(DestroyRef);
  private timer: any = null;

  constructor(private stateManager: YouTubeStateManager) {}

  /**
   * Start polling the YouTube player for position updates
   * @param player The YouTube IFrame Player instance
   * @param onUpdate Callback invoked with updated position in seconds
   */
  startTimer(player: YouTubePlayer | null, onUpdate: (seconds: number) => void): void {
    this.stopTimer();

    if (!player) return;

    this.timer = setInterval(() => {
      if (!player || typeof player.getCurrentTime !== 'function') return;

      try {
        const currentTime = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;

        this.stateManager.setCurrentTime(currentTime);
        this.stateManager.setDuration(duration);

        onUpdate(currentTime);
      } catch (e) {
        console.warn('[YouTubePositionTracker] Failed to get current time', e);
      }
    }, 500);

    // Auto-cleanup on component destroy
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  /**
   * Stop the position polling timer
   */
  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

import { Injectable } from '@angular/core';
import { YouTubeStateManager } from '../state/youtube-state-manager';

type YouTubePlayer = any;

/**
 * Single Responsibility: Control YouTube volume
 *
 * This service handles all volume-related commands (setVolume, mute, unmute).
 * It coordinates with state manager to track mute state and last volume.
 */
@Injectable()
export class YouTubeVolumeController {
  constructor(private stateManager: YouTubeStateManager) {}

  /**
   * Set volume (0-1 normalized to 0-100 for YouTube)
   */
  async setVolume(player: YouTubePlayer | null, value: number): Promise<void> {
    if (!player) return;

    try {
      // Normalize 0-1 to 0-100 for YouTube API
      const volume = Math.floor(value * 100);

      if (typeof player.setVolume === 'function') {
        player.setVolume(volume);
      }

      // Save last volume if not muted
      if (!this.stateManager.isMuted()) {
        this.stateManager.saveLastVolume(volume);
      }
    } catch (e) {
      console.warn('[YouTubeVolumeController] setVolume() failed', e);
    }
  }

  /**
   * Mute the player
   */
  async mute(player: YouTubePlayer | null): Promise<void> {
    if (!player) return;

    try {
      // Save current volume before muting
      if (typeof player.getVolume === 'function') {
        const currentVolume = player.getVolume();
        this.stateManager.saveLastVolume(currentVolume);
      }

      if (typeof player.mute === 'function') {
        player.mute();
      }

      this.stateManager.setMuted(true);
    } catch (e) {
      console.warn('[YouTubeVolumeController] mute() failed', e);
    }
  }

  /**
   * Unmute the player and restore previous volume
   */
  async unmute(player: YouTubePlayer | null): Promise<void> {
    if (!player) return;

    try {
      if (typeof player.unMute === 'function') {
        player.unMute();
      }

      // Restore previous volume
      const lastVolume = this.stateManager.getLastVolume();
      if (typeof player.setVolume === 'function') {
        player.setVolume(lastVolume);
      }

      this.stateManager.setMuted(false);
    } catch (e) {
      console.warn('[YouTubeVolumeController] unmute() failed', e);
    }
  }

  /**
   * Check if player is muted
   */
  isMuted(): boolean {
    return this.stateManager.isMuted();
  }
}

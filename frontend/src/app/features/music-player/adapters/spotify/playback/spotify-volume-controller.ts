import { Injectable } from '@angular/core';
import { SpotifyStateManager } from '../state/spotify-state-manager';

type SpotifyPlayer = any;

/**
 * Single Responsibility: Handle volume and mute operations
 *
 * This service is responsible for controlling volume levels and mute state
 * on the Spotify Web Playback SDK player instance.
 */
@Injectable()
export class SpotifyVolumeController {
  constructor(private stateManager: SpotifyStateManager) {}

  /**
   * Set volume level (0.0 to 1.0)
   */
  async setVolume(player: SpotifyPlayer | null, value: number): Promise<void> {
    const v = this.clamp(value, 0, 1);
    try {
      await player?.setVolume?.(v);
      this.stateManager.setLastVolume(v);
      this.stateManager.setMuted(v === 0);
    } catch (e) {
      console.warn('[SpotifyVolumeController] setVolume() failed', e);
    }
  }

  /**
   * Mute volume (set to 0)
   */
  async mute(player: SpotifyPlayer | null): Promise<void> {
    await this.setVolume(player, 0);
  }

  /**
   * Unmute volume (restore to last non-zero volume)
   */
  async unmute(player: SpotifyPlayer | null): Promise<void> {
    const lastVol = this.stateManager.getLastVolume() || 1.0;
    await this.setVolume(player, lastVol);
  }

  /**
   * Check if currently muted
   */
  isMuted(): boolean {
    return this.stateManager.muted();
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }
}

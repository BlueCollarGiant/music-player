import { Injectable } from '@angular/core';
import { SpotifyStateManager } from '../state/spotify-state-manager';
import { SpotifyDeviceProvider } from '../integration/spotify-device-provider';

type SpotifyPlayer = any;

/**
 * Single Responsibility: Attach/detach Spotify SDK event listeners
 *
 * This service is responsible for setting up event listeners on the Spotify
 * Web Playback SDK player instance and updating state accordingly.
 */
@Injectable()
export class SpotifyListenerManager {
  constructor(
    private stateManager: SpotifyStateManager,
    private deviceProvider: SpotifyDeviceProvider
  ) {}

  /**
   * Attach all necessary event listeners to the Spotify player
   */
  attachListeners(player: SpotifyPlayer | null): void {
    if (!player) return;

    // Ready / Not Ready events
    try {
      player.addListener?.('ready', (info: any) => {
        this.stateManager.setReady(true);
        // Store device ID for Web API calls
        if (info?.device_id) {
          this.deviceProvider.setDeviceId(info.device_id);
        }
      });

      player.addListener?.('not_ready', () => {
        this.stateManager.setReady(false);
      });
    } catch (e) {
      console.warn('[SpotifyListenerManager] Failed to attach ready/not_ready listeners', e);
    }

    // Player state changed
    try {
      player.addListener?.('player_state_changed', (state: any) => {
        if (!state) return;

        const isPlaying = !state.paused;
        const positionMs = state.position ?? 0;
        const durationMs = state.duration ?? 0;
        const currentUri = state.track_window?.current_track?.uri ?? null;

        this.stateManager.setPlaying(!!isPlaying);
        this.stateManager.setBasePositionMs(Math.max(0, positionMs));
        this.stateManager.setLastUpdateTs(this.nowTs());
        this.stateManager.setDurationMs(Math.max(0, durationMs));
        this.stateManager.setTrackUri(currentUri);
      });
    } catch (e) {
      console.warn('[SpotifyListenerManager] Failed to attach player_state_changed listener', e);
    }
  }

  /**
   * Detach event listeners (if needed for cleanup)
   * Note: Spotify Web Playback SDK doesn't expose removeListener consistently
   */
  detachListeners(player: SpotifyPlayer | null): void {
    // The Web Playback SDK doesn't expose removeListener for all events consistently.
    // If you keep one player instance for the app lifetime, you can skip detaching.
    // This method is here for symmetry and future-proofing.
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private nowTs(): number {
    return typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
  }
}

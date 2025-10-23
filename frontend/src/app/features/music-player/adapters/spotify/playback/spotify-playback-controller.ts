import { Injectable } from '@angular/core';
import { SpotifyStateManager } from '../state/spotify-state-manager';
import { SpotifyWebApiService } from '../integration/spotify-web-api.service';

type SpotifyPlayer = any;

/**
 * Single Responsibility: Handle playback commands (play, pause, resume, seek)
 *
 * This service is responsible for executing playback control operations
 * on the Spotify Web Playback SDK player instance.
 */
@Injectable()
export class SpotifyPlaybackController {
  constructor(
    private stateManager: SpotifyStateManager,
    private webApi: SpotifyWebApiService
  ) {}

  /**
   * Start playback of the loaded track
   */
  async start(player: SpotifyPlayer | null): Promise<void> {
    try {
      const trackUri = this.stateManager.trackUri();
      if (!trackUri) {
        console.warn('[SpotifyPlaybackController] No track loaded');
        return;
      }

      await this.webApi.play(trackUri, false);
      const ok = await this.waitForPlaying(player, 2000);
      this.stateManager.setPlaying(!!ok);
    } catch (e) {
      console.warn('[SpotifyPlaybackController] start() failed', e);
    }
  }

  /**
   * Pause playback
   */
  async pause(player: SpotifyPlayer | null): Promise<void> {
    try {
      await player?.pause?.();
      this.stateManager.setPlaying(false);
    } catch (e) {
      console.warn('[SpotifyPlaybackController] pause() failed', e);
    }
  }

  /**
   * Resume playback
   */
  async resume(player: SpotifyPlayer | null): Promise<void> {
    try {
      if (this.stateManager.playing()) {
        return; // Already playing
      }

      const trackUri = this.stateManager.trackUri();
      if (trackUri) {
        // Use Web API to guarantee resume even if SDK thinks paused
        await this.webApi.play(trackUri, true);
      } else {
        await player?.resume?.();
      }

      const ok = await this.waitForPlaying(player, 2000);
      this.stateManager.setPlaying(!!ok);
    } catch (e) {
      console.warn('[SpotifyPlaybackController] resume() failed', e);
    }
  }

  /**
   * Seek to a specific position in seconds
   */
  async seek(player: SpotifyPlayer | null, seconds: number): Promise<void> {
    const ms = Math.max(0, Math.floor(seconds * 1000));
    try {
      await player?.seek?.(ms);
      this.stateManager.setBasePositionMs(ms);
      this.stateManager.setLastUpdateTs(this.nowTs());
    } catch (e) {
      console.warn('[SpotifyPlaybackController] seek() failed', e);
    }
  }

  /**
   * ⚠️ POTENTIALLY UNUSED - TEST YOURSELF ⚠️
   * Skip to next track in Spotify's internal queue
   * @deprecated Likely unused - PlaylistInstanceService handles track navigation
   */
  async next(player: SpotifyPlayer | null): Promise<void> {
    console.warn('[SpotifyPlaybackController.next()] This method may be unused. Verify usage.');
    try {
      await player?.nextTrack?.();
    } catch (e) {
      console.warn('[SpotifyPlaybackController] next() failed', e);
    }
  }

  /**
   * ⚠️ POTENTIALLY UNUSED - TEST YOURSELF ⚠️
   * Skip to previous track in Spotify's internal queue
   * @deprecated Likely unused - PlaylistInstanceService handles track navigation
   */
  async previous(player: SpotifyPlayer | null): Promise<void> {
    console.warn('[SpotifyPlaybackController.previous()] This method may be unused. Verify usage.');
    try {
      await player?.previousTrack?.();
    } catch (e) {
      console.warn('[SpotifyPlaybackController] previous() failed', e);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Wait until SDK reports playing state or timeout
   */
  private waitForPlaying(player: SpotifyPlayer | null, timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const start = this.nowTs();
      const tick = () => {
        try {
          if (this.stateManager.playing()) {
            return resolve(true);
          }
        } catch {}

        if (this.nowTs() - start >= timeoutMs) {
          return resolve(false);
        }

        setTimeout(tick, 100);
      };
      tick();
    });
  }

  private nowTs(): number {
    return typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
  }
}

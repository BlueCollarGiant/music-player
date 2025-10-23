import { Injectable } from '@angular/core';
import { YouTubeStateManager } from '../state/youtube-state-manager';

/**
 * Single Responsibility: Handle YouTube player state change events
 *
 * This service processes the onStateChange event from the YouTube IFrame API
 * and updates the state manager accordingly. It also triggers auto-next when
 * a video ends.
 */
@Injectable()
export class YouTubeListenerManager {
  constructor(private stateManager: YouTubeStateManager) {}

  /**
   * Handle YouTube player state changes
   *
   * @param state YouTube player state constant (from YT.PlayerState)
   * @param YT YouTube IFrame API reference
   * @param onEnded Callback to invoke when video ends (for auto-next)
   */
  handleStateChange(state: number, YT: any, onEnded?: () => void): void {
    if (!YT?.PlayerState) return;

    const PlayerState = YT.PlayerState;

    switch (state) {
      case PlayerState.PLAYING:
        this.stateManager.setPlaying(true);
        break;

      case PlayerState.PAUSED:
        this.stateManager.setPlaying(false);
        break;

      case PlayerState.ENDED:
        this.stateManager.setPlaying(false);

        // Trigger auto-next if callback provided
        if (onEnded) {
          try {
            onEnded();
          } catch (e) {
            console.warn('[YouTubeListenerManager] onEnded callback failed', e);
          }
        }
        break;

      case PlayerState.BUFFERING:
        // YouTube is buffering - could update UI loading state if needed
        break;

      case PlayerState.CUED:
        // Video is cued and ready to play
        this.stateManager.setPlaying(false);
        break;

      default:
        // Unknown state
        break;
    }
  }
}

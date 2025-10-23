import { Injectable } from '@angular/core';
import { YouTubeStateManager } from '../state/youtube-state-manager';

type YouTubePlayer = any;

/**
 * Single Responsibility: Control YouTube playback actions
 *
 * This service handles all playback commands (play, pause, resume, seek).
 * It does NOT manage state or timers - only executes commands on the player.
 */
@Injectable()
export class YouTubePlaybackController {
  constructor(private stateManager: YouTubeStateManager) {}

  /**
   * Load a video by extracting the video ID
   * @param track Track object with id or uri containing YouTube video ID
   */
  async load(track: unknown): Promise<void> {
    try {
      if (!track || typeof track !== 'object') return;

      const song: any = track;
      let videoId: string | null = null;

      // Try song.id first (if it's an 11-char YouTube ID)
      if (song.id && typeof song.id === 'string' && song.id.length === 11) {
        videoId = song.id;
      }
      // Try extracting from URI
      else if (song.uri && typeof song.uri === 'string') {
        videoId = this.extractVideoId(song.uri);
      }

      if (videoId) {
        this.stateManager.setVideoId(videoId);
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] load() failed to extract video ID', e);
    }
  }

  /**
   * Start playback (load and play the current video)
   */
  async start(player: YouTubePlayer | null): Promise<void> {
    if (!player) return;

    try {
      const videoId = this.stateManager.getVideoId();
      if (!videoId) {
        console.warn('[YouTubePlaybackController] start() called but no video ID set');
        return;
      }

      // Wait for player to be ready
      await this.waitForPlaying(player);

      // Load and play
      if (typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] start() failed', e);
    }
  }

  /**
   * Pause playback
   */
  async pause(player: YouTubePlayer | null): Promise<void> {
    if (!player) return;

    try {
      await this.waitForPlaying(player);
      if (typeof player.pauseVideo === 'function') {
        player.pauseVideo();
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] pause() failed', e);
    }
  }

  /**
   * Resume playback
   */
  async resume(player: YouTubePlayer | null): Promise<void> {
    if (!player) return;

    try {
      await this.waitForPlaying(player);
      if (typeof player.playVideo === 'function') {
        player.playVideo();
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] resume() failed', e);
    }
  }

  /**
   * Seek to a specific position in seconds
   */
  async seek(player: YouTubePlayer | null, seconds: number): Promise<void> {
    if (!player) return;

    try {
      await this.waitForPlaying(player);
      if (typeof player.seekTo === 'function') {
        player.seekTo(seconds, true);
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] seek() failed', e);
    }
  }

  /**
   * ⚠️ UNUSED IN PRACTICE - DO NOT CALL DIRECTLY ⚠️
   *
   * PlaylistInstanceService handles track navigation via logic.next() + transitionToSong().
   * UI next/prev buttons call PlaylistInstanceService.next() which uses adapter.load() + adapter.start() instead.
   *
   * This method exists only to satisfy the PlayerPort interface contract but is never invoked.
   *
   * @deprecated Use PlaylistInstanceService.next() for track navigation
   */
  async next(player: YouTubePlayer | null): Promise<void> {
    console.warn('[YouTubePlaybackController.next()] This method is unused. Use PlaylistInstanceService.next() instead.');
    if (!player) return;

    try {
      await this.waitForPlaying(player);
      if (typeof player.nextVideo === 'function') {
        player.nextVideo();
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] next() failed', e);
    }
  }

  /**
   * ⚠️ UNUSED IN PRACTICE - DO NOT CALL DIRECTLY ⚠️
   *
   * PlaylistInstanceService handles track navigation via logic.previous() + transitionToSong().
   * UI next/prev buttons call PlaylistInstanceService.prev() which uses adapter.load() + adapter.start() instead.
   *
   * This method exists only to satisfy the PlayerPort interface contract but is never invoked.
   *
   * @deprecated Use PlaylistInstanceService.prev() for track navigation
   */
  async previous(player: YouTubePlayer | null): Promise<void> {
    console.warn('[YouTubePlaybackController.previous()] This method is unused. Use PlaylistInstanceService.prev() instead.');
    if (!player) return;

    try {
      await this.waitForPlaying(player);
      if (typeof player.previousVideo === 'function') {
        player.previousVideo();
      }
    } catch (e) {
      console.warn('[YouTubePlaybackController] previous() failed', e);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private extractVideoId(uri: string): string | null {
    if (uri.length === 11) return uri;

    // Extract from youtube.com/watch?v=... or youtu.be/...
    const match = uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Wait for the player to be ready before executing commands
   * Returns a promise that resolves when player is ready or rejects after 3 seconds
   */
  private waitForPlaying(player: YouTubePlayer | null): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!player) {
        reject('No player instance');
        return;
      }

      const checkReady = () => {
        if (this.stateManager.isReady()) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();

      // Timeout after 3 seconds
      setTimeout(() => reject('Player not ready after 3s'), 3000);
    });
  }
}

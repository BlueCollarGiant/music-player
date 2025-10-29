import { Injectable, inject } from '@angular/core';
import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { YouTubeStateManager } from '../state/youtube-state-manager';

/**
 * Single Responsibility: Sync YouTube adapter state to global playback store
 *
 * This bridge service mirrors YouTube-specific state to the centralized
 * PlaybackStateStore so the UI and other services can access it uniformly.
 */
@Injectable()
export class YouTubeStateBridge {
  private globalStore = inject(PlaybackStateStore);

  constructor(private stateManager: YouTubeStateManager) {}

  /**
   * Update the global store's position
   */
  updatePosition(seconds: number): void {
    this.globalStore.setCurrentTime(seconds);
  }

  /**
   * Update the global store's duration
   */
  updateDuration(seconds: number): void {
    this.globalStore.setDuration(seconds);
  }

  /**
   * Mirror playing state to global store
   */
  mirrorPlayingState(): void {
    const playing = this.stateManager.isPlaying();
    this.globalStore.setPlaying(playing);
  }

  /**
   * Mirror ready state to global store
   */
  mirrorReadyState(): void {
    const ready = this.stateManager.isReady();
    // Global store doesn't have a "ready" signal, but could add if needed
    // For now, just log for debugging
    if (ready) {
      console.log('[YouTubeStateBridge] YouTube player is ready');
    }
  }

  /**
   * Mirror all relevant state to global store
   * Call this periodically or on state changes
   */
  syncAll(): void {
    this.mirrorPlayingState();
    this.updatePosition(this.stateManager.getCurrentTime());
    this.updateDuration(this.stateManager.getDuration());
  }
}

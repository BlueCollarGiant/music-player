import { Injectable, signal, WritableSignal } from '@angular/core';
import { PlayerPort } from '../../../../../core/playback/player-port';
import { YouTubeStateManager } from '../state/youtube-state-manager';
import { YouTubePositionTracker } from '../state/youtube-position-tracker';
import { YouTubePlaybackController } from '../playback/youtube-playback-controller';
import { YouTubeVolumeController } from '../playback/youtube-volume-controller';
import { YouTubeListenerManager } from './youtube-listener-manager';
import { YouTubeStateBridge } from '../bridges/youtube-state-bridge';

type YouTubePlayer = any;

/**
 * REFACTORED - Now follows SOLID principles!
 *
 * Single Responsibility: Coordinate YouTube playback adapter services
 * This adapter now delegates to specialized services instead of doing everything itself.
 *
 * Open/Closed: Can extend with new services without modifying this class
 * Liskov Substitution: All dependencies can be substituted with alternatives
 * Interface Segregation: Each service has a focused interface
 * Dependency Inversion: Depends on concrete services (YouTube has no token/API layer)
 */
@Injectable({
  providedIn: 'root',
  deps: [
    YouTubeStateManager,
    YouTubePositionTracker,
    YouTubePlaybackController,
    YouTubeVolumeController,
    YouTubeListenerManager,
    YouTubeStateBridge
  ]
})
export class YouTubePlayerAdapter implements PlayerPort {
  readonly kind = 'youtube' as const;

  private playerSig: WritableSignal<YouTubePlayer | null> = signal(null);

  constructor(
    private stateManager: YouTubeStateManager,
    private positionTracker: YouTubePositionTracker,
    private playbackController: YouTubePlaybackController,
    private volumeController: YouTubeVolumeController,
    private listenerManager: YouTubeListenerManager,
    private stateBridge: YouTubeStateBridge
  ) {}

  // ── Wiring API ─────────────────────────────────────────────────────────────
  /**
   * Call this from your YouTube init code once you have the player instance
   * This is called from right-panel.component.ts via PlaylistInstanceService.attachYouTubePlayer()
   */
  setPlayer(player: YouTubePlayer): void {
    this.playerSig.set(player);

    // Start position timer that updates global store
    this.positionTracker.startTimer(player, (currentTime, duration) => {
      this.stateBridge.updatePosition(currentTime);
      this.stateBridge.updateDuration(duration);
    });
  }

  /**
   * Called from right-panel.component.ts when player fires onReady event
   */
  onReady(): void {
    this.stateManager.setReady(true);
    this.stateBridge.mirrorReadyState();
  }

  /**
   * Called from right-panel.component.ts when player fires onStateChange event
   * @param state YouTube player state constant
   * @param YT YouTube IFrame API reference
   * @param onEnded Callback to invoke when video ends (for auto-next)
   */
  onStateChange(state: number, YT: any, onEnded?: () => void): void {
    this.listenerManager.handleStateChange(state, YT, onEnded);
    this.stateBridge.mirrorPlayingState();
  }

  // ── PlayerPort snapshots ───────────────────────────────────────────────────
  isReady(): boolean {
    return this.stateManager.isReady();
  }

  isPlaying(): boolean {
    return this.stateManager.isPlaying();
  }

  /**
   * UNUSED in practice - state store accessed directly. Required by PlayerPort interface.
   */
  durationSeconds(): number {
    return this.stateManager.getDuration();
  }

  /**
   * Used internally for position timer. Required by PlayerPort interface.
   */
  currentTimeSeconds(): number {
    return this.stateManager.getCurrentTime();
  }

  currentIdOrUri(): string | null {
    return this.stateManager.getVideoId();
  }

  // ── PlayerPort controls ────────────────────────────────────────────────────
  async load(track: unknown): Promise<void> {
    await this.playbackController.load(track);
  }

  async start(): Promise<void> {
    await this.playbackController.start(this.playerSig());
  }

  async pause(): Promise<void> {
    await this.playbackController.pause(this.playerSig());
  }

  async resume(): Promise<void> {
    await this.playbackController.resume(this.playerSig());
  }

  async seek(seconds: number): Promise<void> {
    await this.playbackController.seek(this.playerSig(), seconds);
    // Update global store immediately
    this.stateBridge.updatePosition(seconds);
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
  async next(): Promise<void> {
    console.warn('[YouTubePlayerAdapter.next()] This method is unused. Use PlaylistInstanceService.next() instead.');
    await this.playbackController.next(this.playerSig());
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
  async previous(): Promise<void> {
    console.warn('[YouTubePlayerAdapter.previous()] This method is unused. Use PlaylistInstanceService.prev() instead.');
    await this.playbackController.previous(this.playerSig());
  }

  // ── Volume controls ────────────────────────────────────────────────────────
  async setVolume(value: number): Promise<void> {
    await this.volumeController.setVolume(this.playerSig(), value);
  }

  async mute(): Promise<void> {
    await this.volumeController.mute(this.playerSig());
  }

  async unmute(): Promise<void> {
    await this.volumeController.unmute(this.playerSig());
  }

  isMuted(): boolean {
    return this.volumeController.isMuted();
  }

  // ── Teardown (optional) ────────────────────────────────────────────────────
  /**
   * Called from right-panel.component.ts when destroying the player
   */
  async teardown(): Promise<void> {
    try {
      const player = this.playerSig();
      if (player) {
        if (typeof player.stopVideo === 'function') {
          player.stopVideo();
        }
        if (typeof player.destroy === 'function') {
          player.destroy();
        }
      }
    } catch (e) {
      console.warn('[YouTubePlayerAdapter] teardown() failed', e);
    }

    this.playerSig.set(null);
    this.stateManager.reset();
    this.positionTracker.stopTimer();
  }
}

// ── Provider factory function (for DI) ──────────────────────────────────────
export function provideYouTubeAdapter() {
  return [
    // State
    YouTubeStateManager,
    YouTubePositionTracker,

    // Playback
    YouTubePlaybackController,
    YouTubeVolumeController,

    // Core
    YouTubeListenerManager,

    // Bridges
    YouTubeStateBridge,

    // Main adapter
    YouTubePlayerAdapter
  ];
}

import { Injectable, signal } from '@angular/core';
import { PlayerPort } from '../../../../../core/playback/player-port';
import { SpotifyStateManager } from '../state/spotify-state-manager';
import { SpotifyPositionExtrapolator } from '../state/spotify-position-extrapolator';
import { SpotifyPlaybackController } from '../playback/spotify-playback-controller';
import { SpotifyVolumeController } from '../playback/spotify-volume-controller';
import { SpotifyListenerManager } from './spotify-listener-manager';
import { SpotifyStateBridge } from '../bridges/spotify-state-bridge';
import { SpotifyTokenProvider } from '../integration/spotify-token-provider';
import { SpotifyDeviceProvider } from '../integration/spotify-device-provider';
import { LocalStorageSpotifyTokenProvider } from '../integration/local-storage-token-provider';
import { LocalStorageSpotifyDeviceProvider } from '../integration/local-storage-device-provider';
import { SpotifyWebApiService } from '../integration/spotify-web-api.service';

type SpotifyPlayer = any;

/**
 * REFACTORED - Now follows SOLID principles!
 *
 * Single Responsibility: Coordinate Spotify playback adapter services
 * This adapter now delegates to specialized services instead of doing everything itself.
 *
 * Open/Closed: Can extend with new providers without modifying this class
 * Liskov Substitution: All dependencies can be substituted with alternatives
 * Interface Segregation: Each service has a focused interface
 * Dependency Inversion: Depends on abstractions (SpotifyTokenProvider, etc.)
 */
@Injectable({
  providedIn: 'root',
  deps: [
    SpotifyStateManager,
    SpotifyPositionExtrapolator,
    SpotifyPlaybackController,
    SpotifyVolumeController,
    SpotifyListenerManager,
    SpotifyStateBridge
  ]
})
export class SpotifyPlayerAdapter implements PlayerPort {
  readonly kind = 'spotify' as const;

  private playerSig = signal<SpotifyPlayer | null>(null);

  constructor(
    private stateManager: SpotifyStateManager,
    private extrapolator: SpotifyPositionExtrapolator,
    private playbackController: SpotifyPlaybackController,
    private volumeController: SpotifyVolumeController,
    private listenerManager: SpotifyListenerManager,
    private stateBridge: SpotifyStateBridge
  ) {}

  // ── Wiring API ─────────────────────────────────────────────────────────────
  /**
   * Call this from your Spotify init code once you have the `new Spotify.Player(...)` instance
   */
  setPlayer(player: SpotifyPlayer): void {
    this.listenerManager.detachListeners(this.playerSig());
    this.playerSig.set(player);
    this.listenerManager.attachListeners(player);

    // Start position timer that updates global store
    this.extrapolator.startTimer((seconds) => {
      this.stateBridge.updatePosition(seconds);
    });
  }

  // ── PlayerPort snapshots ───────────────────────────────────────────────────
  isReady(): boolean {
    return this.stateManager.ready();
  }

  isPlaying(): boolean {
    return this.stateManager.playing();
  }

  /**
   * UNUSED in practice - state store accessed directly. Required by PlayerPort interface.
   */
  durationSeconds(): number {
    return this.msToSec(this.stateManager.durationMs());
  }

  /**
   * Used internally for position timer. Required by PlayerPort interface.
   */
  currentTimeSeconds(): number {
    return this.extrapolator.computePositionSeconds();
  }

  currentIdOrUri(): string | null {
    return this.stateManager.trackUri();
  }

  // ── PlayerPort controls ────────────────────────────────────────────────────
  async load(track: unknown): Promise<void> {
    // Only record intended track URI; actual playback triggered on start()/resume()
    try {
      if (!track || typeof track !== 'object') return;
      const song: any = track;
      const uri = song.uri || (song.id ? `spotify:track:${song.id}` : null);
      if (uri) {
        this.stateManager.setTrackUri(uri);
      }
    } catch (e) {
      console.warn('[SpotifyPlayerAdapter] load() record uri failed', e);
    }
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
    console.warn('[SpotifyPlayerAdapter.next()] This method is unused. Use PlaylistInstanceService.next() instead.');
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
    console.warn('[SpotifyPlayerAdapter.previous()] This method is unused. Use PlaylistInstanceService.prev() instead.');
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
   * UNUSED - Player lifecycle managed by SpotifyService. Optional in PlayerPort interface.
   */
  async teardown(): Promise<void> {
    try {
      await this.playerSig()?.disconnect?.();
    } catch {}

    this.playerSig.set(null);
    this.stateManager.reset();
    this.extrapolator.stopTimer();
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private msToSec(ms: number): number {
    return Math.floor((ms || 0) / 1000);
  }
}

// ── Provider factory functions (for DI) ─────────────────────────────────────
export function provideSpotifyAdapter() {
  return [
    // State
    SpotifyStateManager,
    SpotifyPositionExtrapolator,

    // Playback
    SpotifyPlaybackController,
    SpotifyVolumeController,

    // Integration (abstract → concrete)
    { provide: SpotifyTokenProvider, useClass: LocalStorageSpotifyTokenProvider },
    { provide: SpotifyDeviceProvider, useClass: LocalStorageSpotifyDeviceProvider },
    SpotifyWebApiService,

    // Core
    SpotifyListenerManager,

    // Bridges
    SpotifyStateBridge,

    // Main adapter
    SpotifyPlayerAdapter
  ];
}

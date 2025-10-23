/**
 * Barrel export for Spotify adapter
 *
 * This file makes it easy to import the Spotify adapter and its providers
 * without needing to know the internal folder structure.
 */

// Main adapter
export { SpotifyPlayerAdapter, provideSpotifyAdapter } from './core/spotify-player.adapter';

// State management (export if needed externally)
export { SpotifyStateManager } from './state/spotify-state-manager';
export { SpotifyPositionExtrapolator } from './state/spotify-position-extrapolator';

// Playback controllers (export if needed externally)
export { SpotifyPlaybackController } from './playback/spotify-playback-controller';
export { SpotifyVolumeController } from './playback/spotify-volume-controller';

// Integration (export abstractions for extension)
export { SpotifyTokenProvider } from './integration/spotify-token-provider';
export { SpotifyDeviceProvider } from './integration/spotify-device-provider';
export { LocalStorageSpotifyTokenProvider } from './integration/local-storage-token-provider';
export { LocalStorageSpotifyDeviceProvider } from './integration/local-storage-device-provider';
export { SpotifyWebApiService } from './integration/spotify-web-api.service';

// Core services
export { SpotifyListenerManager } from './core/spotify-listener-manager';

// Bridges
export { SpotifyStateBridge } from './bridges/spotify-state-bridge';

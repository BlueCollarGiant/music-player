/**
 * Barrel export for YouTube adapter
 *
 * This file makes it easy to import the YouTube adapter and its services
 * without needing to know the internal folder structure.
 */

// Main adapter
export { YouTubePlayerAdapter, provideYouTubeAdapter } from './core/youtube-player.adapter';

// State management (export if needed externally)
export { YouTubeStateManager } from './state/youtube-state-manager';
export { YouTubePositionTracker } from './state/youtube-position-tracker';

// Playback controllers (export if needed externally)
export { YouTubePlaybackController } from './playback/youtube-playback-controller';
export { YouTubeVolumeController } from './playback/youtube-volume-controller';

// Core services
export { YouTubeListenerManager } from './core/youtube-listener-manager';

// Bridges
export { YouTubeStateBridge } from './bridges/youtube-state-bridge';

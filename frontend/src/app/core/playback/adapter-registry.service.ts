import { Injectable } from '@angular/core';
import { PlayerPort } from '../../features/music-player/services/player.port';
import { YouTubeAdapter } from '../../features/music-player/services/adapters/youtube.adapter';
import { SpotifyAdapter } from '../../features/music-player/services/adapters/spotify.adapter';

@Injectable({ providedIn: 'root' })
export class AdapterRegistry {
  constructor(
    private yt: YouTubeAdapter,
    private sp: SpotifyAdapter
  ) {}

  get(platform: PlayerPort['platform']): PlayerPort {
    switch (platform) {
      case 'youtube': return this.yt;
      case 'spotify': return this.sp;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

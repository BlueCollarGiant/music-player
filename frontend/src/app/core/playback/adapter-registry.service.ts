import { Injectable } from '@angular/core';
import { PlayerPort, PlatformKind } from './player-port';
import { YouTubeAdapter } from '../../features/music-player/adapters/youtube.adapter';
import { SpotifyPlayerAdapter } from '../../features/music-player/adapters/spotify';

@Injectable({ providedIn: 'root' })
export class AdapterRegistryService {
  constructor(
    private readonly youtube: YouTubeAdapter,
    private readonly spotify: SpotifyPlayerAdapter
  ) {}

  get(kind: PlatformKind): PlayerPort | null {
    switch (kind) {
      case 'youtube': return this.youtube;
      case 'spotify': return this.spotify;
      default:        return null;
    }
  }

  // Optional convenience getters
  getYouTubeAdapter(): YouTubeAdapter {
    return this.youtube;
  }

  getSpotifyAdapter(): SpotifyPlayerAdapter {
    return this.spotify;
  }
}

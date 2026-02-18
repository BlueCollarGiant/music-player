import { Injectable } from '@angular/core';
import { PlayerPort, PlatformKind } from './player-port';
import { YouTubePlayerAdapter } from '../../features/music-player/adapters/youtube';
import { SpotifyPlayerAdapter } from '../../features/music-player/adapters/spotify';
import { LocalPlayerAdapter } from '../../features/local/adapters/local-player.adapter';

@Injectable({ providedIn: 'root' })
export class AdapterRegistryService {
  constructor(
    private readonly youtube: YouTubePlayerAdapter,
    private readonly spotify: SpotifyPlayerAdapter,
    private readonly local: LocalPlayerAdapter
  ) {}

  get(kind: PlatformKind): PlayerPort | null {
    switch (kind) {
      case 'youtube': return this.youtube;
      case 'spotify': return this.spotify;
      case 'local':   return this.local;
      default:        return null;
    }
  }

  // Optional convenience getters
  getYouTubeAdapter(): YouTubePlayerAdapter {
    return this.youtube;
  }

  getSpotifyAdapter(): SpotifyPlayerAdapter {
    return this.spotify;
  }
}

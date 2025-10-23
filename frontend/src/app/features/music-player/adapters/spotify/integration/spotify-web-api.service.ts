import { Injectable } from '@angular/core';
import { SpotifyTokenProvider } from './spotify-token-provider';
import { SpotifyDeviceProvider } from './spotify-device-provider';

/**
 * Single Responsibility: Handle Spotify Web API HTTP requests
 *
 * This service is responsible for making HTTP calls to the Spotify Web API,
 * such as triggering playback on a specific device.
 *
 * Dependency Inversion: Depends on abstractions (providers) not concretions (localStorage)
 */
@Injectable()
export class SpotifyWebApiService {
  private readonly API_BASE = 'https://api.spotify.com/v1';

  constructor(
    private tokenProvider: SpotifyTokenProvider,
    private deviceProvider: SpotifyDeviceProvider
  ) {}

  /**
   * Trigger playback of a track URI on the configured device
   */
  async play(uri: string, allowIfAlreadyPlaying: boolean = false): Promise<void> {
    try {
      const deviceId = await this.deviceProvider.getDeviceId();
      const token = await this.tokenProvider.getToken();

      if (!deviceId || !token) {
        console.warn('[SpotifyWebApiService] Missing device ID or token');
        return;
      }

      const url = `${this.API_BASE}/me/player/play?device_id=${encodeURIComponent(deviceId)}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri] })
      });

      if (!response.ok) {
        console.warn('[SpotifyWebApiService] Play request failed', response.status, response.statusText);
      }
    } catch (e) {
      console.warn('[SpotifyWebApiService] Play request error', e);
    }
  }
}

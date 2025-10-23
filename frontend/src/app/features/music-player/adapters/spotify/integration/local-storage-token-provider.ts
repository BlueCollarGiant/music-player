import { Injectable } from '@angular/core';
import { SpotifyTokenProvider } from './spotify-token-provider';

/**
 * Concrete implementation: Retrieve Spotify access token from localStorage
 *
 * Open/Closed Principle: Can be swapped with other implementations (API-based, in-memory, etc.)
 * without modifying the adapter code.
 */
@Injectable()
export class LocalStorageSpotifyTokenProvider extends SpotifyTokenProvider {
  private readonly TOKEN_KEY = 'spotify_access_token';

  async getToken(): Promise<string> {
    try {
      return localStorage.getItem(this.TOKEN_KEY) || '';
    } catch (e) {
      console.warn('[LocalStorageSpotifyTokenProvider] Failed to get token', e);
      return '';
    }
  }
}

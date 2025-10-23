import { Injectable } from '@angular/core';
import { SpotifyDeviceProvider } from './spotify-device-provider';

/**
 * Concrete implementation: Retrieve/store Spotify device ID from localStorage
 *
 * Open/Closed Principle: Can be swapped with other implementations (API-based, in-memory, etc.)
 * without modifying the adapter code.
 */
@Injectable()
export class LocalStorageSpotifyDeviceProvider extends SpotifyDeviceProvider {
  private readonly DEVICE_KEY = 'spotify_device_id';

  async getDeviceId(): Promise<string | null> {
    try {
      return localStorage.getItem(this.DEVICE_KEY);
    } catch (e) {
      console.warn('[LocalStorageSpotifyDeviceProvider] Failed to get device ID', e);
      return null;
    }
  }

  async setDeviceId(deviceId: string): Promise<void> {
    try {
      localStorage.setItem(this.DEVICE_KEY, deviceId);
    } catch (e) {
      console.warn('[LocalStorageSpotifyDeviceProvider] Failed to set device ID', e);
    }
  }
}

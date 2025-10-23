/**
 * Dependency Inversion Principle: Abstract device provider
 *
 * This abstract class defines the contract for providing Spotify device IDs.
 * Concrete implementations can use localStorage, API calls, or any other mechanism.
 */
export abstract class SpotifyDeviceProvider {
  abstract getDeviceId(): Promise<string | null>;
  abstract setDeviceId(deviceId: string): Promise<void>;
}

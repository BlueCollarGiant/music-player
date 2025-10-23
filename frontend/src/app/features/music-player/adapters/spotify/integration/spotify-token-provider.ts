/**
 * Dependency Inversion Principle: Abstract token provider
 *
 * This abstract class defines the contract for providing Spotify access tokens.
 * Concrete implementations can use localStorage, API calls, or any other mechanism.
 */
export abstract class SpotifyTokenProvider {
  abstract getToken(): Promise<string>;
}

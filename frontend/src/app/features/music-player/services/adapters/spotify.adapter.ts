import { Injectable } from '@angular/core';
import { PlayerPort } from '../player.port';
import { SpotifyPlaybackService } from '../../../spotify/spotify-playback.service';
// TODO: Consolidate with PlaybackCoordinator by exposing a unified port usage.

@Injectable({ providedIn: 'root' })
export class SpotifyAdapter implements PlayerPort {
  readonly platform = 'spotify' as const;
  constructor(private playback: SpotifyPlaybackService) {}
  async load(trackIdOrUri: string): Promise<void> { await this.playback.load({ id: trackIdOrUri } as any); }
  async start(): Promise<void> { await this.playback.start(); }
  async pause(): Promise<void> { await this.playback.pause(); }
  async resume(): Promise<void> { await this.playback.resume(); }
  async seek(seconds: number): Promise<void> { await this.playback.seek(seconds); }
  async teardown(): Promise<void> { await this.playback.teardown(); }
  isReady(): boolean { return this.playback.ready(); }
  isPlaying(): boolean { return this.playback.isPlaying(); }
  durationSeconds(): number | null { return this.playback.durationSeconds() || null; }
  currentTimeSeconds(): number | null { return this.playback.currentTimeSeconds() || null; }
}

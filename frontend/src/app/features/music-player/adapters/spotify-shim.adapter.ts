import { inject } from '@angular/core';
import { PlayerPort, PlatformKind } from './player-port';
import { SpotifyPlaybackService } from '../services/spotify-playback.service';

// SpotifyShim: temporary adapter delegating to existing SpotifyPlaybackService.
export class SpotifyShimAdapter implements PlayerPort {
  readonly kind: PlatformKind = 'spotify';
  private readonly playback = inject(SpotifyPlaybackService);

  isReady(): boolean { return true; } // SDK state assumed managed externally
  isPlaying(): boolean { return this.playback.isPlaying(); }
  durationSeconds(): number { const d = this.playback.durationMs(); return d ? d / 1000 : 0; }
  currentTimeSeconds(): number { const p = this.playback.progressMs(); return typeof p === 'number' ? p / 1000 : 0; }

  async playOrResume(): Promise<void> { await this.playback.resume().catch(() => {}); }
  async pause(): Promise<void> { await this.playback.pause().catch(() => {}); }
  async seekTo(seconds: number): Promise<void> { await this.playback.seek(seconds).catch(() => {}); }
  async load(track: any): Promise<void> { await this.playback.load(track).catch(() => {}); }
  async start(): Promise<void> { await this.playback.start().catch(() => {}); }
  async teardown(): Promise<void> { /* no-op for now */ }
}

import { Injectable, signal } from '@angular/core';
import { PlayerPort } from '../player.port';

@Injectable({ providedIn: 'root' })
export class YouTubeAdapter implements PlayerPort {
  readonly platform = 'youtube' as const;
  private _ready = signal(false);
  private _playing = signal(false);
  private _duration = signal<number | null>(null);
  private _position = signal<number | null>(null);
  async load(trackIdOrUri: string): Promise<void> {
    this._ready.set(true);
    this._playing.set(false);
    this._position.set(0);
    this._duration.set(null);
  }
  async start(): Promise<void> { this._playing.set(true); }
  async pause(): Promise<void> { this._playing.set(false); }
  async resume(): Promise<void> { this._playing.set(true); }
  async seek(seconds: number): Promise<void> { this._position.set(seconds); }
  async teardown(): Promise<void> { this._playing.set(false); this._ready.set(false); this._duration.set(null); this._position.set(null); }
  isReady(): boolean { return this._ready(); }
  isPlaying(): boolean { return this._playing(); }
  durationSeconds(): number | null { return this._duration(); }
  currentTimeSeconds(): number | null { return this._position(); }
}

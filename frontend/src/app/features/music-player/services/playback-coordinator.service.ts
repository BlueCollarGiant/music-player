import { Injectable, inject } from '@angular/core';
import { PlaylistInstanceService } from '../../../core/playback/playlist-instance';


@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  // Delegation shim to preserve API surface
  private readonly instance = inject(PlaylistInstanceService);

  /** === Core transport controls === */

  // Delegated transport controls
  start(): void { this.instance.play(); }
  resume(): void { this.instance.play(); }
  pause(): void { this.instance.pause(); }
  toggle(): void { this.instance.toggle(); }
  seek(seconds: number): void { this.instance.seek(seconds); }
  next(): void { this.instance.next(); }
  prev(): void { this.instance.prev(); }
  setVolume(value: number): void { (this.instance as any).setVolume?.(value); }
  mute(): void { (this.instance as any).mute?.(); }
  attachYouTubePlayer(player: any): void { this.instance.attachYouTubePlayer(player); }
  attachSpotifyPlayer(player: any): void { this.instance.attachSpotifyPlayer(player); }
}

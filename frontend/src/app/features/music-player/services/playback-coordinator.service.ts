import { Injectable, inject } from '@angular/core';
import { AdapterRegistryService } from './adapter-registry.service';
import { PlaybackStateStore } from './playback-state.store';
import { PlayerPort } from './player-port';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly registry = inject(AdapterRegistryService);
  private readonly state = inject(PlaybackStateStore);

  private get activeAdapter(): PlayerPort | null {
    const kind = this.state.platformKind();
    return kind ? this.registry.get(kind) : null;
  }

  /** === Core transport controls === */

  start(): void {
    this.activeAdapter?.play?.();
    this.state.setPlayingState(true);
  }

  pause(): void {
    this.activeAdapter?.pause?.();
    this.state.setPlayingState(false);
  }

  toggle(): void {
    const isPlaying = this.state.isPlaying();
    if (isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  seek(seconds: number): void {
    this.activeAdapter?.seek?.(seconds);
  }

  next(): void {
    this.activeAdapter?.next?.();
  }

  prev(): void {
    this.activeAdapter?.prev?.();
  }

  setVolume(value: number): void {
    this.activeAdapter?.setVolume?.(value);
  }

  mute(): void {
    this.activeAdapter?.mute?.();
  }
}

import { Injectable, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';
import { AdapterRegistryService } from '../../../core/playback/adapter-registry.service';


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
    this.activeAdapter?.start?.();
    this.state.setPlaying(true);
  }

  pause(): void {
    this.activeAdapter?.pause?.();
    this.state.setPlaying(false);
  }


  resume(): void {
    this.activeAdapter?.resume?.();
    this.state.setPlaying(true);
  }

  toggle(): void {
    const isPlaying = this.state.isPlaying();
    const duration = this.state.durationSeconds();
    const position = this.state.currentTimeSeconds();

    if (isPlaying) {
      this.pause();
    } else if (duration > 0 && position > 0) {
      this.resume();
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
    this.activeAdapter?.previous?.();
  }

  setVolume(value: number): void {
    this.activeAdapter?.setVolume?.(value);
  }

  mute(): void {
    this.activeAdapter?.mute?.();
  }
}

import { Injectable, computed, inject } from '@angular/core';
import { PlaybackStateStore } from './playback-state.store';
import { PlaybackCoordinatorService } from '../../features/music-player/services/playback-coordinator.service';
@Injectable({ providedIn: 'root' })
export class ControlsFacade {
  private readonly state = inject(PlaybackStateStore);
  private readonly coordinator = inject(PlaybackCoordinatorService);

  // Read-only signals for UI
  readonly isReady   = computed(() => this.state.isReady());
  readonly isPlaying = computed(() => this.state.isPlaying());
  readonly duration  = computed(() => this.state.durationSeconds());
  readonly current   = computed(() => this.state.currentTimeSeconds());
  readonly track     = computed(() => this.state.currentTrack()); // your shape
  readonly kind      = computed(() => this.state.platformKind()); // 'youtube' | 'spotify'

  // Uniform commands for UI (platform-agnostic)
  play   = () => this.coordinator.start();
  pause  = () => this.coordinator.pause();
  toggle = () => this.coordinator.toggle();
  seek   = (sec: number) => this.coordinator.seek(sec);
  next   = () => this.coordinator.next();
  prev   = () => this.coordinator.prev();
  // optional
  setVolume = (v: number) => this.coordinator.setVolume?.(v);
  mute      = () => this.coordinator.mute?.();
}
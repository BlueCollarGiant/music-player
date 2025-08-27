import { Injectable, inject, computed, effect } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';
import { AdapterRegistryService } from '../../../core/playback/adapter-registry.service';
import { PlayListLogicService } from './play-list-logic.service';


@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly registry = inject(AdapterRegistryService);
  private readonly state = inject(PlaybackStateStore);
  private readonly playListLogic = inject(PlayListLogicService);

  // Computed active adapter (Bridge #1 foundation)
  private readonly activeAdapter = computed<PlayerPort | null>(() => {
    const kind = this.state.platformKind();
    return kind ? this.registry.get(kind) : null;
  });

  // Bridge #1 — react to selection changes and load into active adapter
  // Minimal effect: load track when currentTrack or platformKind changes; resume if already playing
  private readonly selectionEffect = effect(() => {
    const track: any = this.state.currentTrack();
    const kind = this.state.platformKind();
    const adapter = this.activeAdapter();
    if (!track || !kind || !adapter) return; // null-safe guard

    const incomingId = track.id || track.uri || null;
    const currentId = adapter.currentIdOrUri?.() || null;
    if (incomingId && currentId !== incomingId) {
      try {
        adapter.load(track);
        // console.debug('[PlaybackBridge][selection->sdk] load', kind, incomingId);
      } catch {}
    }
    // If UI says we are playing, ensure adapter is playing (resume if necessary)
    if (this.state.isPlaying()) {
      try { adapter.resume?.(); } catch {}
    }
  });

  /** === Core transport controls === */

  start(): void {
    this.activeAdapter()?.start?.();
    this.state.setPlaying(true);
  }

  pause(): void {
    this.activeAdapter()?.pause?.();
    this.state.setPlaying(false);
  }


  resume(): void {
    this.activeAdapter()?.resume?.();
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
    this.activeAdapter()?.seek?.(seconds);
  }

  // Bridge #2 — Next uses application playlist logic to update selection (store drives adapter via effect)
  next(): void {
    // Advance index but do not loop automatically for explicit next (loop=false)
    const song = this.playListLogic.next(false);
    if (song) {
      this.state.setCurrentTrack(song);
      // console.debug('[PlaybackBridge][next->selection] track', song.id);
    }
  }

  // Bridge #2 — Previous mirrors next logic
  prev(): void {
    const song = this.playListLogic.previous(false);
    if (song) {
      this.state.setCurrentTrack(song);
      // console.debug('[PlaybackBridge][prev->selection] track', song.id);
    }
  }

  setVolume(value: number): void {
    this.activeAdapter()?.setVolume?.(value);
  }

  mute(): void {
    this.activeAdapter()?.mute?.();
  }

  // Bridge #4 — central attach helpers (used by host components)
  attachYouTubePlayer(player: any): void {
    try { this.registry.getYouTubeAdapter().setPlayer(player); } catch {}
  }

  attachSpotifyPlayer(player: any): void {
    try { this.registry.getSpotifyAdapter().setPlayer(player); } catch {}
  }
}

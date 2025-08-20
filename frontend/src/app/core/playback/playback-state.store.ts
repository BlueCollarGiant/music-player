import { Injectable, signal } from '@angular/core';
import { Song } from '../../shared/models/song.model';
import { formatTime } from '../../shared/utils/time-format.util';
import { PlatformKind } from './player-port'; // <-- your unified type

@Injectable({ providedIn: 'root' })
export class PlaybackStateStore {
  // ── UI Tabs ───────────────────────────────────────────────────────────────
  readonly activeTab = signal<string>('Songs');
  readonly tabs: readonly string[] = ['Songs', 'Albums', 'Artists', 'Genres'] as const;

  setActiveTab(tab: string): void { this.activeTab.set(tab); }

  // ── Playback Core State (PlayerPort aligned) ──────────────────────────────
  /** Ready flag (adapter initialized, SDK loaded, etc.) */
  private readonly readySig = signal<boolean>(false);
  /** True if currently playing */
  private readonly playingSig = signal<boolean>(false);
  /** Current position in seconds */
  private readonly currentTimeSecSig = signal<number>(0);
  /** Track duration in seconds */
  private readonly durationSecSig = signal<number>(0);
  /** Current platform kind: 'youtube' | 'spotify' | null */
  private readonly platformKindSig = signal<PlatformKind | null>(null);
  /** Current track object (app-level metadata, not SDK raw) */
  private readonly currentTrackSig = signal<Song | null>(null);

  // Public snapshot getters (what ControlsFacade expects)
  isReady(): boolean { return this.readySig(); }
  isPlaying(): boolean { return this.playingSig(); }
  currentTimeSeconds(): number { return this.currentTimeSecSig(); }
  durationSeconds(): number { return this.durationSecSig(); }
  platformKind(): PlatformKind | null { return this.platformKindSig(); }
  currentTrack(): Song | null { return this.currentTrackSig(); }

  // Mutators (called by coordinator/adapters)
  setReady(val: boolean): void { this.readySig.set(val); }
  setPlaying(val: boolean): void { this.playingSig.set(val); }
  setCurrentTime(sec: number): void { this.currentTimeSecSig.set(Math.max(0, sec)); }
  setDuration(sec: number): void { this.durationSecSig.set(Math.max(0, sec)); }
  setPlatformKind(kind: PlatformKind | null): void { this.platformKindSig.set(kind); }
  setCurrentTrack(track: Song | null): void { this.currentTrackSig.set(track); }

  // ── UI Convenience Signals (formatted, % progress, bars) ───────────────────
  /** Percent 0-100 progress for the progress bar */
  readonly currentProgress = signal<number>(0);
  /** Formatted "M:SS" current time */
  readonly currentTimeFmt = signal<string>('0:00');
  /** Animated audio bars */
  readonly audioBars = signal<number[]>(Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100))));

  updateProgress(percent: number, currentSeconds: number): void {
    this.currentProgress.set(Math.max(0, Math.min(100, percent)));
    this.updateCurrentTimeFmt(currentSeconds);
  }

  private updateCurrentTimeFmt(currentSeconds: number): void {
    if (typeof currentSeconds === 'number' && !isNaN(currentSeconds)) {
      this.currentTimeFmt.set(formatTime(currentSeconds));
    }
  }

  updateDurationFmt(durationSeconds: number): void {
    const formattedDuration = formatTime(durationSeconds);
    const track = this.currentTrackSig();
    if (track && (!track.duration || track.duration === '0:00')) {
      this.currentTrackSig.set({ ...track, duration: formattedDuration });
    }
  }
}

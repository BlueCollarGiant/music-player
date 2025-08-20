import { Injectable, signal } from '@angular/core';
import { Song } from '../../shared/models/song.model';
import { formatTime } from '../../shared/utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class PlaybackStateStore {
  // UI Tabs
  readonly activeTab = signal<string>('Songs');
  readonly tabs: readonly string[] = ['Songs', 'Albums', 'Artists', 'Genres'] as const;

  // Playback core state
  readonly isPlaying = signal<boolean>(false);
  readonly currentProgress = signal<number>(0); // percent 0-100
  readonly currentTime = signal<string>('0:00');
  readonly currentTrack = signal<Song | null>(null);
  readonly audioBars = signal<number[]>(Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100))));

  setActiveTab(tab: string): void { this.activeTab.set(tab); }
  setPlayingState(playing: boolean): void { this.isPlaying.set(playing); }

  selectTrack(song: Song): void {
    if (song.isPlaceholder) return;
    this.currentTrack.set(song);
    this.isPlaying.set(false);
  }

  updateProgress(percentage: number, currentSeconds: number): void {
    this.currentProgress.set(Math.max(0, Math.min(100, percentage)));
    this.updateCurrentTime(currentSeconds);
  }

  updateCurrentTime(currentSeconds: number): void {
    if (typeof currentSeconds === 'number' && !isNaN(currentSeconds)) {
      this.currentTime.set(formatTime(currentSeconds));
    }
  }

  updateDuration(durationSeconds: number): void {
    const formattedDuration = formatTime(durationSeconds);
    const track = this.currentTrack();
    if (track && (!track.duration || track.duration === '0:00')) {
      this.currentTrack.set({ ...track, duration: formattedDuration });
    }
  }
}

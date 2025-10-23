import { Injectable, signal, WritableSignal } from '@angular/core';

/**
 * Single Responsibility: Manage YouTube player state signals
 *
 * This service is the single source of truth for all YouTube player state.
 * It only manages state - no logic, no side effects, just getters and setters.
 */
@Injectable()
export class YouTubeStateManager {
  // ── Player state signals ───────────────────────────────────────────────────
  readonly ready: WritableSignal<boolean> = signal(false);
  readonly playing: WritableSignal<boolean> = signal(false);
  readonly duration: WritableSignal<number> = signal(0);
  readonly currentTime: WritableSignal<number> = signal(0);
  readonly currentVideoId: WritableSignal<string | null> = signal(null);

  // ── Volume state ───────────────────────────────────────────────────────────
  private readonly mutedSignal: WritableSignal<boolean> = signal(false);
  private lastVolume = 100;

  // ── State getters ──────────────────────────────────────────────────────────
  isReady(): boolean {
    return this.ready();
  }

  isPlaying(): boolean {
    return this.playing();
  }

  getDuration(): number {
    return this.duration();
  }

  getCurrentTime(): number {
    return this.currentTime();
  }

  getVideoId(): string | null {
    return this.currentVideoId();
  }

  isMuted(): boolean {
    return this.mutedSignal();
  }

  getLastVolume(): number {
    return this.lastVolume;
  }

  // ── State setters ──────────────────────────────────────────────────────────
  setReady(ready: boolean): void {
    this.ready.set(ready);
  }

  setPlaying(playing: boolean): void {
    this.playing.set(playing);
  }

  setDuration(duration: number): void {
    this.duration.set(duration);
  }

  setCurrentTime(time: number): void {
    this.currentTime.set(time);
  }

  setVideoId(id: string | null): void {
    this.currentVideoId.set(id);
  }

  setMuted(muted: boolean): void {
    this.mutedSignal.set(muted);
  }

  saveLastVolume(volume: number): void {
    this.lastVolume = volume;
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  reset(): void {
    this.ready.set(false);
    this.playing.set(false);
    this.duration.set(0);
    this.currentTime.set(0);
    this.currentVideoId.set(null);
    this.mutedSignal.set(false);
    this.lastVolume = 100;
  }
}

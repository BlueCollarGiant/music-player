import { Injectable, inject } from '@angular/core';
import { PlayerPort, PlatformKind } from '../../../core/playback/player-port';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';

// ── Constants ──────────────────────────────────────────────────────────────────
/** Interval (ms) between position/duration sync ticks into the global store. */
const POSITION_TICK_MS = 250;

/** HTMLAudioElement readyState value meaning "enough data to play". */
const HAVE_CURRENT_DATA = 2;

/**
 * LocalPlayerAdapter — PlayerPort implementation for local audio files.
 *
 * Wraps a single HTMLAudioElement. No network calls, no auth, no IndexedDB.
 * State is pushed into PlaybackStateStore on a fixed interval and on key events.
 *
 * PR3 will supply real file blobs via LocalLibraryService; for now the adapter
 * resolves a playable URL from `song.streamUrl`, `song.url`, or `song.sourceUrl`.
 */
@Injectable({ providedIn: 'root' })
export class LocalPlayerAdapter implements PlayerPort {
  readonly kind: PlatformKind = 'local';

  private readonly store = inject(PlaybackStateStore);

  private readonly audio = new Audio();
  /** Current track identifier for currentIdOrUri(). */
  private currentId: string | null = null;
  /** setInterval handle for position ticks. */
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  /** Last blob URL created for local playback — revoked on next load() or teardown(). */
  private lastBlobUrl: string | null = null;

  constructor() {
    this.audio.addEventListener('playing', () => {
      this.store.setPlaying(true);
      this.store.setReady(true);
    });
    this.audio.addEventListener('pause', () => {
      this.store.setPlaying(false);
    });
    this.audio.addEventListener('ended', () => {
      this.store.setPlaying(false);
    });
    this.audio.addEventListener('durationchange', () => {
      const d = this.audio.duration;
      if (isFinite(d)) this.store.setDuration(d);
    });
    this.audio.addEventListener('canplay', () => {
      this.store.setReady(true);
    });
    this.audio.addEventListener('error', () => {
      this.store.setPlaying(false);
      this.store.setReady(false);
    });
  }

  // ── PlayerPort: state snapshots ─────────────────────────────────────────────

  isReady(): boolean {
    return this.audio.readyState >= HAVE_CURRENT_DATA;
  }

  isPlaying(): boolean {
    return !this.audio.paused;
  }

  durationSeconds(): number {
    const d = this.audio.duration;
    return isFinite(d) ? d : 0;
  }

  currentTimeSeconds(): number {
    return this.audio.currentTime;
  }

  currentIdOrUri(): string | null {
    return this.currentId;
  }

  // ── PlayerPort: controls ────────────────────────────────────────────────────

  async load(track: unknown): Promise<void> {
    const song = track as Record<string, unknown>;

    const url =
      (song['streamUrl'] as string | undefined) ||
      (song['uri']       as string | undefined) ||
      (song['url']       as string | undefined) ||
      (song['sourceUrl'] as string | undefined) ||
      null;

    if (!url) {
      throw new Error('LocalPlayerAdapter.load: no playable URL on Song');
    }

    // Revoke previous blob URL before taking the new src
    if (this.lastBlobUrl) {
      URL.revokeObjectURL(this.lastBlobUrl);
      this.lastBlobUrl = null;
    }
    if (url.startsWith('blob:')) {
      this.lastBlobUrl = url;
    }

    this.audio.src = url;
    this.audio.load();

    this.currentId = (song['id'] as string | undefined) ?? url;

    this.store.setReady(false);
    this.store.setCurrentTime(0);
    this.store.setDuration(0);

    this.startTick();
  }

  start(): void {
    this.audio.play().catch(() => {});
  }

  pause(): void {
    this.audio.pause();
  }

  resume(): void {
    this.audio.play().catch(() => {});
  }

  seek(seconds: number): void {
    this.audio.currentTime = seconds;
    this.store.setCurrentTime(seconds);
  }

  setVolume(value: number): void {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  mute(): void {
    this.audio.muted = true;
  }

  /**
   * next() and previous() are unused in practice — PlaylistInstanceService
   * handles navigation via logic.next() + transitionToSong().
   * Implemented only to satisfy the PlayerPort contract.
   */
  next(): void {
    console.warn('[LocalPlayerAdapter.next()] Unused. Use PlaylistInstanceService.next() instead.');
  }

  previous(): void {
    console.warn('[LocalPlayerAdapter.previous()] Unused. Use PlaylistInstanceService.prev() instead.');
  }

  teardown(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
    if (this.lastBlobUrl) {
      URL.revokeObjectURL(this.lastBlobUrl);
      this.lastBlobUrl = null;
    }
    this.stopTick();
    this.currentId = null;
    this.store.setPlaying(false);
    this.store.setReady(false);
    this.store.setCurrentTime(0);
    this.store.setDuration(0);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private startTick(): void {
    this.stopTick();
    this.tickHandle = setInterval(() => {
      this.store.setCurrentTime(this.audio.currentTime);
      const d = this.audio.duration;
      if (isFinite(d)) this.store.setDuration(d);
    }, POSITION_TICK_MS);
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

}

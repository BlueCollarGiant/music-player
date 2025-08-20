export type PlatformKind = 'youtube' | 'spotify';

export interface PlayerPort {
  /** Preferred identifier used across the app */
  readonly kind: PlatformKind;

  // ── State snapshots (synchronous) ───────────────────────────────────────────
  isReady(): boolean;
  isPlaying(): boolean;
  /** Total duration in seconds; return 0 if unknown */
  durationSeconds(): number;
  /** Current position in seconds; return 0 if unknown */
  currentTimeSeconds(): number;

  // ── Controls (async; implementations may return void for SDKs w/ callbacks) ─
  /** Prepare the platform for the given track (id/uri/object depending on platform) */
  load(track: unknown): Promise<void> | void;

  /** Begin playback (after load if needed) */
  start(): Promise<void> | void;

  /** Pause playback */
  pause(): Promise<void> | void;

  /** Resume playback */
  resume(): Promise<void> | void;

  /** Seek to absolute time (seconds) */
  seek(seconds: number): Promise<void> | void;

   /** Skip to next item in the active queue/playlist */
  next(): Promise<void> | void;

  /** Skip to previous item in the active queue/playlist */
  previous(): Promise<void> | void;

  /** Optional cleanup / teardown (idempotent) */
  teardown?(): Promise<void> | void;

   /** Set output volume [0.0, 1.0] (implementations may clamp) */
  setVolume(value: number): Promise<void> | void;

  /** Mute output (implementations may also track pre-mute volume) */
  mute(): Promise<void> | void;

  /** Optional: used by coordinators to compare track identity */
  currentIdOrUri?(): string | null;
}
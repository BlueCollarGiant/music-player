export type PlatformKind = 'youtube' | 'spotify';

export interface PlayerPort {
  readonly platform: PlatformKind;

  // lifecycle / transport
  load(trackIdOrUri: string): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(seconds: number): Promise<void>;
  teardown(): Promise<void>;

  // readonly snapshots (can be stubbed initially)
  isReady(): boolean;
  isPlaying(): boolean;
  durationSeconds(): number | null;
  currentTimeSeconds(): number | null;
}

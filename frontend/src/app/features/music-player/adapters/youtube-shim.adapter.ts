import { signal, computed } from '@angular/core';
import { PlayerPort, PlatformKind } from './player-port';

// YouTubeShim: wraps a raw YouTube IFrame API player instance provided externally.
export class YouTubeShimAdapter implements PlayerPort {
  readonly kind: PlatformKind = 'youtube';
  private readonly playerSig = signal<any | null>(null);
  private readonly readySig = signal<boolean>(false);
  private readonly playingSig = signal<boolean>(false);

  // Exposed so coordinator can wire events.
  setPlayer(player: any | null) { this.playerSig.set(player); }
  setReady(ready: boolean) { this.readySig.set(ready); }
  setPlaying(playing: boolean) { this.playingSig.set(playing); }

  isReady(): boolean { return this.readySig(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { try { return this.playerSig()?.getDuration?.() || 0; } catch { return 0; } }
  currentTimeSeconds(): number { try { return this.playerSig()?.getCurrentTime?.() || 0; } catch { return 0; } }

  playOrResume(): void { try { this.playerSig()?.playVideo?.(); } catch {} }
  pause(): void { try { this.playerSig()?.pauseVideo?.(); } catch {} }
  seekTo(seconds: number): void { try { this.playerSig()?.seekTo?.(seconds, true); } catch {} }
  load(track: any): void { if (!track?.video_url) return; try { this.playerSig()?.loadVideoById?.(track.videoId || track.id); } catch {} }
  start(): void { this.playOrResume(); }
  teardown(): void { /* no-op */ }
}

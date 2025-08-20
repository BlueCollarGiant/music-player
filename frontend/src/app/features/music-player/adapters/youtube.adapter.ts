import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';

@Injectable({ providedIn: 'root' })
export class YouTubeAdapter implements PlayerPort {
  readonly kind = 'youtube' as const;
  private readonly destroyRef = inject(DestroyRef);

  private playerSig = signal<any | null>(null);
  private readySig = signal(false);
  private playingSig = signal(false);
  private durationSig = signal(0);       // seconds
  private currentTimeSig = signal(0);    // seconds
  private currentVideoId: string | null = null;
  private timer: any = null;

  // ---- PlayerPort snapshots
  isReady(): boolean { return this.readySig(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { return this.durationSig(); }
  currentTimeSeconds(): number { return this.currentTimeSig(); }
  currentIdOrUri(): string | null { return this.currentVideoId; }

  // ---- Wiring from IFrame integrator
  setPlayer(player: any) { this.playerSig.set(player); }
  onReady() {
    this.readySig.set(true);
    try { this.durationSig.set(Math.floor(this.playerSig()?.getDuration() || 0)); } catch {}
  }
  onStateChange(state: number, YTRef: any, autoAdvance: () => void) {
    if (!YTRef) return;
    if (state === YTRef.PlayerState.PLAYING) { this.playingSig.set(true); this.startTimer(); }
    else if (state === YTRef.PlayerState.PAUSED) { this.playingSig.set(false); this.stopTimer(); }
    else if (state === YTRef.PlayerState.ENDED) { this.playingSig.set(false); this.stopTimer(); autoAdvance(); }
    try {
      this.durationSig.set(Math.floor(this.playerSig()?.getDuration() || 0));
      this.currentTimeSig.set(Math.floor(this.playerSig()?.getCurrentTime() || 0));
    } catch {}
  }

  // ---- Controls
  async load(trackOrId: unknown): Promise<void> {
    const id = this.extractVideoId(trackOrId);
    if (!id) return;
    this.currentVideoId = id;
    try { this.playerSig()?.loadVideoById(id); } catch {}
    this.currentTimeSig.set(0);
  }
  async start(): Promise<void> { this.playOrResume(); }
  playOrResume(): void { try { this.playerSig()?.playVideo?.(); this.playingSig.set(true); } catch {} }
  async resume(): Promise<void> { this.playOrResume(); }
  async pause(): Promise<void> { try { this.playerSig()?.pauseVideo?.(); this.playingSig.set(false); } catch {} }
  async seek(seconds: number): Promise<void> {
    try { this.playerSig()?.seekTo?.(seconds, true); this.currentTimeSig.set(Math.floor(seconds)); } catch {}
  }

  // ---- Back-compat aliases (so we can delete the shim safely)
  async seekTo(seconds: number): Promise<void> { return this.seek(seconds); }
  async loadTrack(track: unknown): Promise<void> { return this.load(track); }

  async teardown(): Promise<void> {
    this.stopTimer();
    this.playerSig.set(null);
    this.readySig.set(false);
    this.playingSig.set(false);
    this.currentVideoId = null;
  }

  // ---- helpers
  private extractVideoId(trackOrId: unknown): string | null {
    if (typeof trackOrId === 'string') return trackOrId;
    const t = trackOrId as any;
    return t?.id || t?.videoId || t?.video_id || t?.video_url || null;
  }

  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;
    this.timer = window.setInterval(() => {
      try {
        this.currentTimeSig.set(Math.floor(this.playerSig()?.getCurrentTime() || 0));
        this.durationSig.set(Math.floor(this.playerSig()?.getDuration() || 0));
      } catch {}
    }, 500);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }
  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
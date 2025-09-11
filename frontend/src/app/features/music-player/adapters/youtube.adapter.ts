
import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';

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
  private readonly state = inject(PlaybackStateStore); // Bridge #3

  // ── PlayerPort snapshots ───────────────────────────────────────────────────
  isReady(): boolean { return this.readySig(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { return this.durationSig(); }
  currentTimeSeconds(): number { return this.currentTimeSig(); }
  currentIdOrUri(): string | null { return this.currentVideoId; }

  // ── IFrame wiring (called by host component) ───────────────────────────────
  setPlayer(player: any) { this.playerSig.set(player); }

  onReady() {
    this.readySig.set(true);
    try {
      const d = Math.floor(this.playerSig()?.getDuration?.() || 0);
      this.durationSig.set(d);
      this.state.setDuration(d);
      this.state.setReady?.(true as any); // setReady exists; keep call defensive (no rename)
    } catch {}
  }

  onStateChange(state: number, YTRef: any, autoAdvance: () => void) {
    if (!YTRef) return;

    if (state === YTRef.PlayerState.PLAYING) {
      this.playingSig.set(true);
  this.state.setPlaying(true); // Bridge #3 mirror
      this.startTimer();
    } else if (state === YTRef.PlayerState.PAUSED) {
      this.playingSig.set(false);
  this.state.setPlaying(false);
      this.stopTimer();
    } else if (state === YTRef.PlayerState.ENDED) {
      this.playingSig.set(false);
  this.state.setPlaying(false);
      this.stopTimer();
      autoAdvance();
    }

    // defensive refresh
    try {
      const d = Math.floor(this.playerSig()?.getDuration?.() || 0);
      const c = Math.floor(this.playerSig()?.getCurrentTime?.() || 0);
      this.durationSig.set(d);
      this.currentTimeSig.set(c);
      this.state.setDuration(d);
      this.state.setCurrentTime(c);
    } catch {}
  }

  // ── PlayerPort controls (core) ─────────────────────────────────────────────
  async load(trackOrId: unknown): Promise<void> {
    const id = this.extractVideoId(trackOrId);
    if (!id) return;
    this.currentVideoId = id;
    try { this.playerSig()?.loadVideoById?.(id); } catch {}
    this.currentTimeSig.set(0);
  this.state.setCurrentTime(0);
  }

  // Note: On YouTube, playVideo() resumes from current time; if you want strict
  // "start from 0", call seek(0) first (coordinator can choose policy).
  async start(): Promise<void> {
    try {
      // Attempt autoplay; do not flip UI state until confirmed
      this.playerSig()?.playVideo?.();
      const ok = await this.waitForPlaying(2000);
      this.playingSig.set(!!ok);
      this.state.setPlaying(!!ok);
    } catch {}
  }

  async resume(): Promise<void> {
    // On YT this is effectively playVideo() from current position
    try {
      this.playerSig()?.playVideo?.();
      const ok = await this.waitForPlaying(2000);
      this.playingSig.set(!!ok);
      this.state.setPlaying(!!ok);
    } catch {}
  }

  async pause(): Promise<void> {
  try { this.playerSig()?.pauseVideo?.(); this.playingSig.set(false); this.state.setPlaying(false);} catch {}
  }

  async seek(seconds: number): Promise<void> {
    try {
      this.playerSig()?.seekTo?.(seconds, true);
      this.currentTimeSig.set(Math.max(0, Math.floor(seconds)));
  this.state.setCurrentTime(Math.max(0, Math.floor(seconds)));
    } catch {}
  }

  // ── PlayerPort controls (navigation & volume) ──────────────────────────────
  async next(): Promise<void> {
    // Works if player has a playlist; otherwise your coordinator handles queue.
    try { this.playerSig()?.nextVideo?.(); } catch {}
  }

  async previous(): Promise<void> {
    try { this.playerSig()?.previousVideo?.(); } catch {}
  }

  async setVolume(value: number): Promise<void> {
    // PlayerPort uses [0.0..1.0]; YouTube expects [0..100]
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    try { this.playerSig()?.setVolume?.(pct); } catch { }
  }

  async mute(): Promise<void> {
    try {
      this.playerSig()?.mute?.();
    } catch { }
  }

  async unmute(): Promise<void> {
    try {
      this.playerSig()?.unMute?.();
    } catch { }
  }

  isMuted(): boolean {
    try {
      return this.playerSig()?.isMuted?.() ?? false;
    } catch {
      return false;
    }
  }

  async teardown(): Promise<void> {
    this.stopTimer();
    this.playerSig.set(null);
    this.readySig.set(false);
    this.playingSig.set(false);
    this.currentVideoId = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private extractVideoId(trackOrId: unknown): string | null {
    if (typeof trackOrId === 'string') return trackOrId;
    const t = trackOrId as any;
    return t?.id || t?.videoId || t?.video_id || t?.video_url || null;
    // feel free to add URL parsing here if you pass full watch URLs
  }

  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;
    this.timer = window.setInterval(() => {
      try {
  const c = Math.floor(this.playerSig()?.getCurrentTime?.() || 0);
  const d = Math.floor(this.playerSig()?.getDuration?.() || 0);
  this.currentTimeSig.set(c);
  this.durationSig.set(d);
  this.state.setCurrentTime(c);
  this.state.setDuration(d);
      } catch {}
    }, 500);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Wait until adapter observes PLAYING, or timeout. */
  private waitForPlaying(timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const start = Date.now();
      const check = () => {
        try {
          if (this.playingSig()) return resolve(true);
          // Extra check via raw player state if available
          const player: any = this.playerSig();
          const YT: any = (typeof window !== 'undefined' ? (window as any).YT : undefined);
          const state = player?.getPlayerState?.();
          if (YT?.PlayerState && state === YT.PlayerState.PLAYING) return resolve(true);
        } catch {}
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(check, 100);
      };
      check();
    });
  }
}

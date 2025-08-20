// src/app/features/music-player/adapters/youtube.adapter.ts
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
    try { this.durationSig.set(Math.floor(this.playerSig()?.getDuration?.() || 0)); } catch {}
  }

  onStateChange(state: number, YTRef: any, autoAdvance: () => void) {
    if (!YTRef) return;

    if (state === YTRef.PlayerState.PLAYING) {
      this.playingSig.set(true);
      this.startTimer();
    } else if (state === YTRef.PlayerState.PAUSED) {
      this.playingSig.set(false);
      this.stopTimer();
    } else if (state === YTRef.PlayerState.ENDED) {
      this.playingSig.set(false);
      this.stopTimer();
      autoAdvance();
    }

    // defensive refresh
    try {
      this.durationSig.set(Math.floor(this.playerSig()?.getDuration?.() || 0));
      this.currentTimeSig.set(Math.floor(this.playerSig()?.getCurrentTime?.() || 0));
    } catch {}
  }

  // ── PlayerPort controls (core) ─────────────────────────────────────────────
  async load(trackOrId: unknown): Promise<void> {
    const id = this.extractVideoId(trackOrId);
    if (!id) return;
    this.currentVideoId = id;
    try { this.playerSig()?.loadVideoById?.(id); } catch {}
    this.currentTimeSig.set(0);
  }

  // Note: On YouTube, playVideo() resumes from current time; if you want strict
  // "start from 0", call seek(0) first (coordinator can choose policy).
  async start(): Promise<void> {
    try { this.playerSig()?.playVideo?.(); this.playingSig.set(true); } catch {}
  }

  async resume(): Promise<void> {
    // On YT this is effectively playVideo() from current position
    try { this.playerSig()?.playVideo?.(); this.playingSig.set(true); } catch {}
  }

  async pause(): Promise<void> {
    try { this.playerSig()?.pauseVideo?.(); this.playingSig.set(false); } catch {}
  }

  async seek(seconds: number): Promise<void> {
    try {
      this.playerSig()?.seekTo?.(seconds, true);
      this.currentTimeSig.set(Math.max(0, Math.floor(seconds)));
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
        this.currentTimeSig.set(Math.floor(this.playerSig()?.getCurrentTime?.() || 0));
        this.durationSig.set(Math.floor(this.playerSig()?.getDuration?.() || 0));
      } catch {}
    }, 500);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
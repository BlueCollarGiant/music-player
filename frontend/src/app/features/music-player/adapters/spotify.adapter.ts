import { Injectable, signal, effect } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';

type SpotifyPlayer = any;   // If you have types: import type { SpotifyPlayer } from 'spotify-web-playback-sdk';

@Injectable({ providedIn: 'root' })
export class SpotifyAdapter implements PlayerPort {
  readonly kind = 'spotify' as const;

  // Raw SDK handle (set this once your SDK initializes)
  private playerSig = signal<SpotifyPlayer | null>(null);

  // Snapshots (ms or seconds as noted)
  private readySig = signal(false);
  private playingSig = signal(false);
  private durationMsSig = signal(0);
  private basePositionMs = signal(0);
  private lastUpdateTs = signal(0);
  private trackUri: string | null = null;

  // Volume/mute snapshot (SDK has no isMuted, so we track it)
  private mutedSig = signal(false);
  private lastVolume = 1.0;

  // ── Wiring API ─────────────────────────────────────────────────────────────
  /** Call this from your Spotify init code once you have the `new Spotify.Player(...)` instance */
  setPlayer(player: SpotifyPlayer) {
    this.detachListeners(this.playerSig());
    this.playerSig.set(player);
    this.attachListeners(player);
  }

  private attachListeners(player: SpotifyPlayer | null) {
    if (!player) return;

    // ready / not_ready
    try {
      player.addListener?.('ready', () => { this.readySig.set(true); });
      player.addListener?.('not_ready', () => { this.readySig.set(false); });
    } catch {}

    // state changes
    try {
      player.addListener?.('player_state_changed', (state: any) => {
        if (!state) return;

        const isPlaying = !state.paused;
        const positionMs = state.position ?? 0;
        const durationMs = state.duration ?? 0;
        const currentUri = state.track_window?.current_track?.uri ?? null;

        this.playingSig.set(!!isPlaying);
        this.basePositionMs.set(Math.max(0, positionMs));
        this.lastUpdateTs.set(nowTs());
        this.durationMsSig.set(Math.max(0, durationMs));
        this.trackUri = currentUri;
      });
    } catch {}
  }

  private detachListeners(player: SpotifyPlayer | null) {
    // The Web Playback SDK doesn’t expose removeListener for all events consistently.
    // If you keep one player instance for the app lifetime, you can skip detaching.
    // This method is here for symmetry and future-proofing.
  }

  // ── Extrapolation ─────────────────────────────────────────────────────────
  private computePositionMs(): number {
    const dur = this.durationMsSig();
    if (!dur) return 0;
    let pos = this.basePositionMs();
    if (this.playingSig()) pos += Math.max(0, nowTs() - this.lastUpdateTs());
    return clamp(pos, 0, dur);
  }

  // ── PlayerPort snapshots ───────────────────────────────────────────────────
  isReady(): boolean { return this.readySig(); }
  isPlaying(): boolean { return this.playingSig(); }
  durationSeconds(): number { return msToSec(this.durationMsSig()); }
  currentTimeSeconds(): number { return msToSec(this.computePositionMs()); }
  currentIdOrUri(): string | null { return this.trackUri; }

  // ── PlayerPort controls ────────────────────────────────────────────────────
  async load(track: unknown): Promise<void> {
    // Spotify playback device can only begin with a "play" call against the Web API for the device_id.
    // If your app uses Web API to load URIs to this device, you might not need to do anything here.
    // You can keep this as a no-op or trigger your Web API call here.
    return;
  }

  async start(): Promise<void> {
    // start ~ play from current position (strict "from 0" requires a prior seek(0))
    try { await this.playerSig()?.resume?.(); this.playingSig.set(true); } catch {}
  }

  async pause(): Promise<void> {
    try { await this.playerSig()?.pause?.(); this.playingSig.set(false); } catch {}
  }

  async resume(): Promise<void> {
    try { await this.playerSig()?.resume?.(); this.playingSig.set(true); } catch {}
  }

  async seek(seconds: number): Promise<void> {
    const ms = Math.max(0, Math.floor(seconds * 1000));
    try {
      await this.playerSig()?.seek?.(ms);
      this.basePositionMs.set(ms);
      this.lastUpdateTs.set(nowTs());
    } catch {}
  }

  async next(): Promise<void> {
    try { await this.playerSig()?.nextTrack?.(); } catch {}
  }

  async previous(): Promise<void> {
    try { await this.playerSig()?.previousTrack?.(); } catch {}
  }

  async setVolume(value: number): Promise<void> {
    const v = clamp(value, 0, 1);
    try {
      await this.playerSig()?.setVolume?.(v);
      if (v > 0) this.lastVolume = v;
      this.mutedSig.set(v === 0);
    } catch {}
  }

  async mute(): Promise<void> {
    await this.setVolume(0);
  }

  async unmute(): Promise<void> {
    await this.setVolume(this.lastVolume || 1.0);
  }

  isMuted(): boolean {
    return this.mutedSig();
  }

  async teardown(): Promise<void> {
    try { await this.playerSig()?.disconnect?.(); } catch {}
    this.playerSig.set(null);
    this.readySig.set(false);
    this.playingSig.set(false);
    this.durationMsSig.set(0);
    this.basePositionMs.set(0);
    this.trackUri = null;
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
function nowTs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
function msToSec(ms: number): number { return Math.floor((ms || 0) / 1000); }
function clamp(n: number, min: number, max: number): number { return Math.min(Math.max(n, min), max); }
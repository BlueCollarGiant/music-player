import { Injectable, signal, effect, inject } from '@angular/core';
import { PlayerPort } from '../../../core/playback/player-port';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';

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
  private readonly state = inject(PlaybackStateStore); // Bridge #3
  private positionTimer: any = null;

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

        // Bridge #3 mirrors
        this.state.setPlaying(!!isPlaying);
        this.state.setDuration(msToSec(durationMs));
        this.state.setCurrentTime(msToSec(positionMs));
      });
    } catch {}

    // Start a lightweight interval to mirror extrapolated position
    if (!this.positionTimer && typeof window !== 'undefined') {
      this.positionTimer = window.setInterval(() => {
        try {
          if (this.playingSig()) {
            const posSec = this.currentTimeSeconds();
            this.state.setCurrentTime(posSec);
          }
        } catch {}
      }, 1000);
    }
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
    // Only record intended track URI; actual playback triggered on start()/resume()
    try {
      if (!track || typeof track !== 'object') return;
      const song: any = track;
      const uri = song.uri || (song.id ? `spotify:track:${song.id}` : null);
      if (uri) this.trackUri = uri;
    } catch (e) {
      console.warn('[SpotifyAdapter] load() record uri failed', e);
    }
  }

  async start(): Promise<void> {
    try {
      if (!this.trackUri) return; // nothing selected
      await this.ensureWebApiPlay(this.trackUri, false);
    } catch (e) { console.warn('[SpotifyAdapter] start() failed', e); }
  }

  async pause(): Promise<void> {
  try { await this.playerSig()?.pause?.(); this.playingSig.set(false); this.state.setPlaying(false);} catch {}
  }

  async resume(): Promise<void> {
    try {
      if (this.playingSig()) return; // already playing
      if (this.trackUri) {
        // Use Web API to guarantee playback resumes even if SDK thinks paused
        await this.ensureWebApiPlay(this.trackUri, true);
      } else {
        await this.playerSig()?.resume?.();
      }
      this.playingSig.set(true); this.state.setPlaying(true);
    } catch (e) { console.warn('[SpotifyAdapter] resume() failed', e); }
  }

  async seek(seconds: number): Promise<void> {
    const ms = Math.max(0, Math.floor(seconds * 1000));
    try {
      await this.playerSig()?.seek?.(ms);
      this.basePositionMs.set(ms);
      this.lastUpdateTs.set(nowTs());
  this.state.setCurrentTime(seconds);
    } catch {}
  }

  async next(): Promise<void> {
    try { await this.playerSig()?.nextTrack?.(); } catch {}
  }

  async previous(): Promise<void> {
    try { await this.playerSig()?.previousTrack?.(); } catch {}
  }

  // --- Internal helpers ----------------------------------------------------
  private async ensureWebApiPlay(uri: string, allowIfAlreadyPlaying: boolean): Promise<void> {
    const deviceId = localStorage.getItem('spotify_device_id');
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!deviceId || !accessToken) return;
    if (!allowIfAlreadyPlaying && this.playingSig()) return;
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] })
    });
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
  if (this.positionTimer) { try { clearInterval(this.positionTimer); } catch {}; this.positionTimer = null; }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
function nowTs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
function msToSec(ms: number): number { return Math.floor((ms || 0) / 1000); }
function clamp(n: number, min: number, max: number): number { return Math.min(Math.max(n, min), max); }
import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

interface SpotifyTrackMeta {
  uri: string;
  name: string;
  artist: string;
  image: string;
  durationMs: number;
}

interface SpotifyPlayerWindow extends Window { Spotify?: any; }

@Injectable({ providedIn: 'root' })
export class SpotifyPlaybackService {
  private platformId = inject(PLATFORM_ID);

  // SDK / Player state
  private sdkReady = signal(false);
  private playerReady = signal(false);
  private deviceId: string | null = null;
  private player: any = null;
  private loadingScript = false;
  private _deviceActivated = false; // becomes true after successful transfer to this SDK device

  // Playback state
  private _isPlaying = signal(false);
  private _progressMs = signal(0);
  private _durationMs = signal(0);
  private _track = signal<SpotifyTrackMeta | null>(null);
  private premiumBlocked = signal(false);

  readonly isReady = computed(() => this.playerReady());
  readonly isPlaying = computed(() => this._isPlaying());
  readonly progressMs = computed(() => this._progressMs());
  readonly durationMs = computed(() => this._durationMs());
  readonly track = computed(() => this._track());
  readonly isPremiumBlocked = computed(() => this.premiumBlocked());

  // Public API
  async ensurePlayer(getToken: () => Promise<string>): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.loadScript();
    if (this.player) return; // already created

    await new Promise<void>((resolve) => {
      const w = window as SpotifyPlayerWindow;
      const tryCreate = () => {
        if (!w.Spotify) { setTimeout(tryCreate, 100); return; }
        this.player = new w.Spotify.Player({
          name: 'Web Player (App)',
          getOAuthToken: async (cb: (t: string) => void) => {
            try { cb(await getToken()); } catch { cb(''); }
          },
          volume: 0.6
        });
        this.registerPlayerListeners();
        resolve();
      };
      tryCreate();
    });
  }

  async connect(): Promise<boolean> {
    if (!this.player) return false;
    const ok = await this.player.connect();
    return ok;
  }

  async startPlayback(opts: { uris?: string[]; contextUri?: string; offsetIndex?: number; }): Promise<void> {
    await this.ensureDeviceActive();
    if (!this.deviceId) return; // safety
    const token = await this.fetchToken();
    if (!token) return;
    const body: any = {};
    if (opts.contextUri) {
      body.context_uri = opts.contextUri;
      if (typeof opts.offsetIndex === 'number') body.offset = { position: opts.offsetIndex };
    } else if (opts.uris) {
      body.uris = opts.uris;
    }
    await fetch('https://api.spotify.com/v1/me/player/play?device_id=' + this.deviceId, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(()=>{});
    // Prime local UI/state in case the SDK event is slightly delayed
    await this.primeStateAfterPlay();
  }

  async togglePlay(): Promise<void> { try { await this.ensureDeviceActive(); await this.player?.togglePlay(); } catch {} }
  async next(): Promise<void> { try { await this.ensureDeviceActive(); await this.player?.nextTrack(); } catch {} }
  async previous(): Promise<void> { try { await this.ensureDeviceActive(); await this.player?.previousTrack(); } catch {} }
  async seek(ms: number): Promise<void> {
    try {
      await this.ensureDeviceActive();
      await this.player?.seek(ms);
      // Optimistic immediate signal updates (coordinator will derive smooth progress)
      const s = await this.player?.getCurrentState?.();
      if (s) {
        // Mutate state locally so UI jumps instantly; then reconcile shortly after
        s.position = ms; // override for optimism
        this.emitStateFromSdk(s);
      } else {
        this._progressMs.set(ms);
      }
      setTimeout(async () => {
        try {
          const st = await this.player?.getCurrentState?.();
          if (st) this.emitStateFromSdk(st); // reconcile if drift
        } catch {}
      }, 300);
    } catch {}
  }
  async setVolume(v: number): Promise<void> { try { await this.player?.setVolume(v); } catch {} }

  // Internal helpers
  private registerPlayerListeners() {
    if (!this.player) return;
    this.player.addListener('ready', async ({ device_id }: any) => {
      this.deviceId = device_id;
      this.playerReady.set(true);
      // Attempt transferring playback to this new web device WITHOUT auto-play.
      try {
        await this.ensureDeviceActive();
      } catch (e) {
        console.warn('[SpotifyPlayback] device activation failed', e);
      }
    });
    this.player.addListener('not_ready', () => { this.playerReady.set(false); });
    this.player.addListener('player_state_changed', (state: any) => {
      if (!state) return;
      this.emitStateFromSdk(state);
    });
    this.player.addListener('initialization_error', (e: any) => this.handleError(e));
    this.player.addListener('authentication_error', (e: any) => this.handleError(e));
    this.player.addListener('account_error', (e: any) => { this.premiumBlocked.set(true); this.handleError(e); });
    this.player.addListener('playback_error', (e: any) => this.handleError(e));
  }

  private handleError(e: any) {
    console.warn('[SpotifyPlayback] error', e?.message || e);
  }

  private async loadScript(): Promise<void> {
    if (this.sdkReady() || this.loadingScript) return;
    this.loadingScript = true;
    await new Promise<void>((resolve) => {
      const existing = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
      if (existing) { this.sdkReady.set(true); this.loadingScript = false; return resolve(); }
      const tag = document.createElement('script');
      tag.src = 'https://sdk.scdn.co/spotify-player.js';
      tag.onload = () => { this.sdkReady.set(true); resolve(); };
      document.head.appendChild(tag);
    });
    this.loadingScript = false;
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const resp = await fetch(`${environment.apiUrl}/api/platforms/spotify/token`, { headers: this.defaultHeaders() });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.access_token;
    } catch { return null; }
  }

  private defaultHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  //----------- Device Activation & State Priming -----------//
  private async ensureDeviceActive(): Promise<void> {
    if (this._deviceActivated) return;
    if (!this.deviceId) {
      await this.waitFor(() => !!this.deviceId);
    }
    if (!this.deviceId) throw new Error('No device id');
    // Transfer playback (no autoplay) so subsequent play commands target our SDK device.
    const ok = await this.apiPut('/me/player', { device_ids: [this.deviceId], play: false });
    if (ok) this._deviceActivated = true;
  }

  private async primeStateAfterPlay(): Promise<void> {
    // Query current state repeatedly until available (SDK can lag immediately after /play)
    for (let i = 0; i < 8; i++) {
      try {
        const s = await this.player?.getCurrentState?.();
        if (s) { this.emitStateFromSdk(s); return; }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
  }

  private emitStateFromSdk(state: any) {
    // Consolidated mapping; allows reuse by primeStateAfterPlay & listener
    try {
      this._isPlaying.set(!state.paused);
      this._progressMs.set(state.position || 0);
      const track = state.track_window?.current_track;
      if (track) {
        const duration = track.duration_ms || state.duration || 0;
        this._durationMs.set(duration);
        this._track.set({
          uri: track.uri,
          name: track.name,
          artist: (track.artists || []).map((a: any) => a.name).join(', '),
          image: track.album?.images?.[0]?.url || '',
          durationMs: duration
        });
      }
    } catch (e) {
      // Swallow mapping errors to avoid breaking listener chain
    }
  }

  private async apiPut(path: string, body: any): Promise<boolean> {
    const token = await this.fetchToken();
    if (!token) return false;
    const attempt = async () => fetch(`https://api.spotify.com/v1${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    try {
      const resp = await attempt();
      if (resp.status === 401 || resp.status === 403) {
        // try refresh once
        const t2 = await this.fetchToken();
        if (!t2) return false;
        const resp2 = await fetch(`https://api.spotify.com/v1${path}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t2 },
          body: JSON.stringify(body)
        });
        return resp2.ok;
      }
      return resp.ok;
    } catch { return false; }
  }

  private async waitFor(cond: () => boolean, timeoutMs = 5000, stepMs = 100): Promise<void> {
    const start = Date.now();
    while (!cond()) {
      if (Date.now() - start > timeoutMs) throw new Error('timeout waiting for condition');
      await new Promise(r => setTimeout(r, stepMs));
    }
  }
}

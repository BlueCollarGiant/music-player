import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

import { Song } from '../../../shared/models/song.model';
import { mapSpotifyTracksToSongs, mapSpotifyTrackToSong } from '../../Spotify/spotify.mapper';
import { PlaylistInstanceService } from '../../../core/playback/playlist-instance';

export interface SpotifyPlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_count: number;
}
export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail_url?: string;
  position: number;
  preview_url?: string | null;
  external_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private readonly apiBase = `${environment.apiUrl}/api/platforms/spotify`;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly instance = inject(PlaylistInstanceService);

  // --- SDK state ---
  private sdkLoaded = false;
  private player: any = null;
  private fetchingToken = false; // legacy flag (kept for compatibility)
  private tokenFetchPromise: Promise<string> | null = null; // central de-duped fetch
  private lastProvidedToken: string | null = null; // for diagnostics

  // Reactive state (kept as-is to mirror YouTubeService)
  playlists = signal<SpotifyPlaylist[]>([]);
  selectedPlaylist = signal<SpotifyPlaylist | null>(null);
  playlistTracks = signal<SpotifyTrack[]>([]);
  isLoading = signal(false);

  // Map helpers (kept)
  toSongs(): Song[] { return mapSpotifyTracksToSongs(this.playlistTracks()); }
  toSong = (t: SpotifyTrack): Song => mapSpotifyTrackToSong(t);

  constructor() {
    // Define global callback early (browser only)
    if (isPlatformBrowser(this.platformId)) {
      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        this.initPlayer();
      };
    }
  }

  // =============== SDK bootstrap ===============

  /** Call when entering Spotify platform (once per app session). */
  ensureSdkLoaded(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.sdkLoaded) {
      // If SDK already parsed (hot reload), init immediately
      if ((window as any).Spotify?.Player) this.initPlayer();
      return;
    }
    this.sdkLoaded = true;

    // Prime access token early so SDK has one when it first calls getOAuthToken
    this.ensureAccessTokenPrimed();
    // Set up periodic token refresh every 5 minutes (lightweight)
    if (isPlatformBrowser(this.platformId)) {
      setInterval(() => this.ensureAccessTokenPrimed(), 5 * 60 * 1000);
    }

    // If script tag already present, rely on its callback
    if (document.getElementById('spotify-sdk')) {
      // Ensure callback exists even if script was injected elsewhere
      (window as any).onSpotifyWebPlaybackSDKReady = () => this.initPlayer();
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    // Defensive: define (or overwrite) global just before adding script so race cannot occur
    (window as any).onSpotifyWebPlaybackSDKReady = () => this.initPlayer();
    document.body.appendChild(script);
  }

  /** Create the Web Playback SDK player and attach to the instance. */
  private initPlayer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.player) return;

    const SpotifyNS = (window as any).Spotify;
    if (!SpotifyNS?.Player) return; // SDK not ready yet

    this.player = new SpotifyNS.Player({
      name: 'Web Player',
      volume: 0.8,
      // IMPORTANT: provide token asynchronously; never return empty string
      getOAuthToken: async (cb: (t: string) => void) => {
        try {
          const token = await this.provideSpotifyToken();
          if (token) {
            this.lastProvidedToken = token;
            cb(token);
          } else {
            console.warn('[SpotifyService] provideSpotifyToken() returned empty; forcing refresh retry in 750ms');
            setTimeout(async () => {
              const retry = await this.provideSpotifyToken(true);
              if (retry) { this.lastProvidedToken = retry; cb(retry); }
            }, 750);
          }
        } catch (e) {
          console.error('[SpotifyService] Failed to supply OAuth token', e);
        }
      },
    });

    // Device is ready → hand to instance (adapter mirrors state)
    this.player.addListener('ready', ({ device_id }: any) => {
      try { this.instance.attachSpotifyPlayer(this.player); } catch {}
  // Stash device id for potential Web API playback transfers
  try { localStorage.setItem('spotify_device_id', device_id); } catch {}
      // If you transfer playback via Web API, you can store device_id here.
      // console.log('[Spotify SDK] ready', device_id);
    });

    this.player.addListener('not_ready', ({ device_id }: any) => {
      // console.warn('[Spotify SDK] device went offline', device_id);
    });

    this.player.addListener('initialization_error', (e: any) => console.error('[Spotify SDK] init error', e));
    this.player.addListener('authentication_error', (e: any) => {
      console.error('[Spotify SDK] auth error', e);
      // Force-refresh token then attempt reconnect; the SDK will re-call getOAuthToken
      this.provideSpotifyToken(true).catch(()=>{});
    });
    this.player.addListener('account_error', (e: any) => console.error('[Spotify SDK] account error', e));

    this.player.connect();
  }

  /** Legacy sync accessor (avoid for SDK usage). Returns cached token or null. */
  private getCachedToken(): string | null {
    const sp = localStorage.getItem('spotify_access_token');
    return sp && sp.length > 10 ? sp : null;
  }

  /** Core token provider with de-duplication + optional force refresh. */
  private async provideSpotifyToken(force: boolean = false): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) return '';

    // If a fetch is in-flight, await it (unless forcing)
    if (this.tokenFetchPromise && !force) {
      try { return await this.tokenFetchPromise; } catch { /* fallthrough */ }
    }

    // Use cached if still valid
    if (!force) {
      const exp = localStorage.getItem('spotify_access_token_expires_at');
      const token = this.getCachedToken();
      if (token && exp) {
        const expMs = parseInt(exp, 10);
        if (!isNaN(expMs) && expMs > Date.now() + 60_000) {
          return token;
        }
      } else if (token && !exp) {
        // No known expiry; assume usable and let periodic refresh handle
        return token;
      }
    }

    // Start fresh fetch
    const jwt = localStorage.getItem('auth_token');
    if (!jwt) return '';

    this.tokenFetchPromise = firstValueFrom(
      this.http.get<{ access_token: string; expires_at?: string | number | null }>(`${this.apiBase}/token`, { headers: this.authHeaders() })
    ).then(res => {
      if (res?.access_token) {
        localStorage.setItem('spotify_access_token', res.access_token);
        let expiresAtMs: number | null = null;
        const raw = res.expires_at;
        if (raw) {
          if (typeof raw === 'string' && /\d{4}-\d{2}-\d{2}T/.test(raw)) {
            expiresAtMs = Date.parse(raw);
          } else if (typeof raw === 'number') {
            expiresAtMs = raw > 10_000_000_000 ? raw : raw * 1000;
          } else if (typeof raw === 'string') {
            const parsed = parseInt(raw, 10); if (!isNaN(parsed)) expiresAtMs = parsed > 10_000_000_000 ? parsed : parsed * 1000;
          }
        }
        if (!expiresAtMs) expiresAtMs = Date.now() + 55 * 60 * 1000; // pessimistic
        localStorage.setItem('spotify_access_token_expires_at', String(expiresAtMs));
        return res.access_token;
      }
      throw new Error('No access_token in response');
    }).catch(err => {
      console.error('[SpotifyService] token fetch failed', err);
      return '';
    }).finally(() => {
      // Allow future fetches
      setTimeout(() => { this.tokenFetchPromise = null; }, 250);
    });

    return this.tokenFetchPromise;
  }

  /** Ensure we have a reasonably fresh Spotify access token cached (idempotent). */
  private ensureAccessTokenPrimed(): void {
    // Fire and forget (will use cached if valid)
    this.provideSpotifyToken().catch(()=>{});
  }

  /** Fetch / refresh the Spotify access token from backend token endpoint. */
  // Back-compat shim retained (now just calls provideSpotifyToken)
  private fetchSpotifyAccessToken(force: boolean = false): void {
    this.provideSpotifyToken(force).catch(()=>{});
  }

  // =============== API (unchanged surface) ===============

  private authHeaders(): HttpHeaders {
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isPlatformBrowser(this.platformId)) return base;
    const tok = localStorage.getItem('auth_token');
    return tok ? base.set('Authorization', `Bearer ${tok}`) : base;
  }

  loadPlaylists(): void {
    this.isLoading.set(true);
    this.http
      .get<{ playlists: SpotifyPlaylist[] }>(`${this.apiBase}/playlists`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => this.playlists.set(res.playlists || []),
        error: (err) => {
          console.error('[SpotifyService] playlists load error', err);
          this.playlists.set([]);
        },
        complete: () => this.isLoading.set(false),
      });
  }

  loadPlaylistTracks(id: string): void {
    this.isLoading.set(true);
    this.http
      .get<{ tracks: any[] }>(`${this.apiBase}/playlists/${id}/tracks`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => {
          const fmt = (ms: number) => {
            const m = Math.floor(ms / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            return `${m}:${s.toString().padStart(2, '0')}`;
          };
          const tracks: SpotifyTrack[] = (res.tracks || []).map((t: any, idx: number) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            duration: t.duration_ms ? fmt(t.duration_ms) : (t.duration || '0:00'),
            thumbnail_url: t.thumbnail_url,
            position: idx,
            preview_url: t.preview_url ?? null,
            external_url: t.external_url ?? null,
          }));
          this.playlistTracks.set(tracks);
          // Sync into shared playlist instance as generic Song list for cross-platform queues
          try {
            const songs: Song[] = this.toSongs();
            this.instance.syncPlaylist(songs, songs[0]?.id);
          } catch (e) {
            console.warn('[SpotifyService] syncPlaylist failed', e);
          }
        },
        error: (err) => {
          console.error('[SpotifyService] tracks load error', err);
          this.playlistTracks.set([]);
        },
        complete: () => this.isLoading.set(false),
      });
  }

  selectPlaylist(pl: SpotifyPlaylist): void {
    this.selectedPlaylist.set(pl);
  // Set active platform for unified instance
  try { this.instance.setPlatform('spotify' as any); } catch {}
    this.loadPlaylistTracks(pl.id);
  }
}

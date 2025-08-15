import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

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
  duration: string; // mm:ss
  thumbnail_url?: string;
  position: number;
  preview_url?: string | null;
  external_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private readonly apiBase = `${environment.apiUrl}/api/platforms/spotify`;
  private readonly platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  playlists = signal<SpotifyPlaylist[]>([]);
  selectedPlaylist = signal<SpotifyPlaylist | null>(null);
  playlistTracks = signal<SpotifyTrack[]>([]);
  isLoading = signal(false);

  private authHeaders(): HttpHeaders {
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isPlatformBrowser(this.platformId)) return base;
    const tok = localStorage.getItem('auth_token');
    return tok ? base.set('Authorization', `Bearer ${tok}`) : base;
  }

  loadPlaylists() {
    this.isLoading.set(true);
    this.http.get<{ playlists: any[] }>(`${this.apiBase}/playlists`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        console.debug('[SpotifyService] playlists response', res);
        this.playlists.set(res.playlists as SpotifyPlaylist[]);
      },
      error: (err) => {
        console.error('[SpotifyService] playlists load error', err);
        this.playlists.set([]);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  loadPlaylistTracks(id: string) {
    this.isLoading.set(true);
    this.http.get<{ tracks: any[] }>(`${this.apiBase}/playlists/${id}/tracks`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        console.debug('[SpotifyService] tracks response', res);
        // Convert duration_ms if present to mm:ss
    const tracks = (res.tracks || []).map((t: any, idx: number) => {
          const durationMs = t.duration_ms || 0;
          const mins = Math.floor(durationMs / 60000);
            const secs = Math.floor((durationMs % 60000) / 1000);
            const pad = (n: number) => n.toString().padStart(2, '0');
          return {
            id: t.id,
            title: t.title,
            artist: t.artist,
            duration: `${pad(mins)}:${pad(secs)}`,
            thumbnail_url: t.thumbnail_url,
      position: idx,
      preview_url: t.preview_url || null,
      external_url: t.external_url || null
          } as SpotifyTrack;
        });
        this.playlistTracks.set(tracks);
      },
      error: (err) => {
        console.error('[SpotifyService] tracks load error', err);
        this.playlistTracks.set([]);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  selectPlaylist(pl: SpotifyPlaylist) {
    this.selectedPlaylist.set(pl);
    this.loadPlaylistTracks(pl.id);
  }

  // Convert a SpotifyTrack to unified Song shape
  toSong(t: SpotifyTrack) {
    return {
      id: t.id,
      name: t.title,
      artist: t.artist,
      duration: t.duration,
      platform: 'spotify' as const,
      thumbnail_url: t.thumbnail_url,
      thumbnailUrl: t.thumbnail_url,
      previewUrl: t.preview_url || null,
      externalUrl: t.external_url || null,
      durationMs: undefined,
      isPlaceholder: false
    };
  }
}

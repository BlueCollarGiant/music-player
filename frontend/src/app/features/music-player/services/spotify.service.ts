/** SpotifyService: REST playlists/tracks + mapping only.
 *  Playback & SDK integration live in SpotifyAdapter (implements PlayerPort).
 */
import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

import { Song } from '../../../shared/models/song.model';
import { mapSpotifyTracksToSongs, mapSpotifyTrackToSong } from '../../Spotify/spotify.mapper';


export interface SpotifyPlaylist { id: string; title: string; description?: string; thumbnail_url?: string; video_count: number; }
export interface SpotifyTrack { id: string; title: string; artist: string; duration: string; thumbnail_url?: string; position: number; preview_url?: string | null; external_url?: string | null; }

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private readonly apiBase = `${environment.apiUrl}/api/platforms/spotify`;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  toSongs(): Song[] { return mapSpotifyTracksToSongs(this.playlistTracks()); }
  toSong = (t: SpotifyTrack): Song => mapSpotifyTrackToSong(t);
  // Reactive state (mirrors YouTubeService surface)
  playlists = signal<SpotifyPlaylist[]>([]);
  selectedPlaylist = signal<SpotifyPlaylist | null>(null);
  playlistTracks = signal<SpotifyTrack[]>([]);
  isLoading = signal(false);

  // Auth header helper (kept from prior version)
  private authHeaders(): HttpHeaders {
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isPlatformBrowser(this.platformId)) return base;
    const tok = localStorage.getItem('auth_token');
    return tok ? base.set('Authorization', `Bearer ${tok}`) : base;
  }

  // ================= API =================
  loadPlaylists(): void {
    this.isLoading.set(true);
    this.http.get<{ playlists: SpotifyPlaylist[] }>(`${this.apiBase}/playlists`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        this.playlists.set(res.playlists || []);
      },
      error: (err) => {
        console.error('[SpotifyService] playlists load error', err);
        this.playlists.set([]);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  loadPlaylistTracks(id: string): void {
    this.isLoading.set(true);
    this.http.get<{ tracks: any[] }>(`${this.apiBase}/playlists/${id}/tracks`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        const fmt = (ms: number) => { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `${m}:${s.toString().padStart(2,'0')}`; };
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
      },
      error: (err) => {
        console.error('[SpotifyService] tracks load error', err);
        this.playlistTracks.set([]);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  selectPlaylist(pl: SpotifyPlaylist): void {
    this.selectedPlaylist.set(pl);
    this.loadPlaylistTracks(pl.id);
  }

  selectPlaylistById(id: string): void {
    const found = this.playlists().find(p => p.id === id) || null;
    if (found) this.selectedPlaylist.set(found);
    this.loadPlaylistTracks(id);
  }

}

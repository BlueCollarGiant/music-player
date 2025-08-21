import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../../../shared/models/song.model';
import { environment } from '../../../../environments/environment';
import { mapYouTubeTracksToSongs } from '../../youtube/youtube.mapper';
import { getYouTubeId, buildYouTubeEmbedUrl} from '../../../shared/utils/youtube.util';

export interface YouTubePlaylist {
  id: string;                    // ensure this matches your backend
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_count: number;
  created_at?: string;
}

export interface YouTubePlaylistTrack {
  id: string;                    // video id
  title: string;
  artist: string;
  duration: string;              // legacy H:MM:SS or M:SS
  duration_ms?: number;          // optional numeric duration if backend provides
  thumbnail_url?: string;
  video_url: string;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class YouTubeService {
  private readonly apiUrl = `${environment.apiUrl}/api/youtube`;
  private readonly platformId = inject(PLATFORM_ID);
  constructor(private http: HttpClient) {}

  // ── Reactive state ─────────────────────────────────────────────────────────
  readonly playlists        = signal<YouTubePlaylist[]>([]);
  readonly selectedPlaylist = signal<YouTubePlaylist | null>(null);
  readonly playlistTracks   = signal<YouTubePlaylistTrack[]>([]);
  readonly isLoading        = signal<boolean>(false);

  // ── Auth headers ───────────────────────────────────────────────────────────
  private getAuthHeaders(): HttpHeaders {
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isPlatformBrowser(this.platformId)) return base;
    const token = localStorage.getItem('auth_token');
    return token ? base.set('Authorization', `Bearer ${token}`) : base;
  }

  // ── API calls ──────────────────────────────────────────────────────────────
  getUserPlaylists(): Observable<{ playlists: YouTubePlaylist[]; total: number }> {
    this.isLoading.set(true);
    return this.http
      .get<{ playlists: YouTubePlaylist[]; total: number }>(`${this.apiUrl}/playlists`, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isLoading.set(false)));
  }

  getPlaylistTracks(playlistId: string): Observable<{ tracks: YouTubePlaylistTrack[]; playlist_id: string; total: number }> {
    this.isLoading.set(true);
    return this.http
      .get<{ tracks: YouTubePlaylistTrack[]; playlist_id: string; total: number }>(
        `${this.apiUrl}/playlists/${playlistId}/tracks`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(finalize(() => this.isLoading.set(false)));
  }

  // ── Loaders / selection orchestration ──────────────────────────────────────
  loadPlaylists(): void {
    this.getUserPlaylists().subscribe({
      next: res => this.playlists.set(res.playlists ?? []),
      error: () => this.playlists.set([]),
    });
  }

  loadPlaylistTracks(playlistId: string): void {
    this.getPlaylistTracks(playlistId).subscribe({
      next: res => this.playlistTracks.set(res.tracks ?? []),
      error: () => this.playlistTracks.set([]),
    });
  }

  /** Select by object (existing behavior) */
  selectPlaylist(pl: YouTubePlaylist): void {
    this.selectedPlaylist.set(pl);
    this.loadPlaylistTracks(pl.id);
  }

  /** Select by id (convenience for callers) */
  selectPlaylistById(playlistId: string): void {
    const found = this.playlists().find(p => p.id === playlistId) ?? null;
    this.selectedPlaylist.set(found);
    this.loadPlaylistTracks(playlistId);
  }

  // ── Track helpers (indexing / navigation) ───────────────────────────────────
  getTrackIndex(id: string): number {
    return this.playlistTracks().findIndex(t => t.id === id);
  }

  nextTrackId(currentId: string): string | null {
    const tracks = this.playlistTracks();
    if (!tracks.length) return null;
    const idx = this.getTrackIndex(currentId);
    const nextIdx = idx >= 0 ? (idx + 1) % tracks.length : 0;
    return tracks[nextIdx]?.id ?? null;
  }

  previousTrackId(currentId: string): string | null {
    const tracks = this.playlistTracks();
    if (!tracks.length) return null;
    const idx = this.getTrackIndex(currentId);
    const prevIdx = idx > 0 ? idx - 1 : tracks.length - 1;
    return tracks[prevIdx]?.id ?? null;
  }

  // ── Domain conversions ─────────────────────────────────────────────────────
  toSongs(): Song[] {
    return mapYouTubeTracksToSongs(this.playlistTracks());
  }

  /** Map a single track (sometimes handy for detail views) */
  toSong(track: YouTubePlaylistTrack): Song {
    return mapYouTubeTracksToSongs([track])[0];
  }

 
  buildEmbedUrlForTrack(track: YouTubePlaylistTrack, opts?: Parameters<typeof buildYouTubeEmbedUrl>[1]): string {
    const id = getYouTubeId(track.video_url) ?? track.id;
    return buildYouTubeEmbedUrl(id, { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, enablejsapi: 1, ...opts });
  }
}
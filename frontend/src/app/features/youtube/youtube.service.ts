import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../../shared/models/song.model';
import { environment } from '../../../environments/environment';

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_count: number;
  created_at?: string;
}

export interface YouTubePlaylistTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail_url?: string;
  video_url: string;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class YouTubeService {
  //==================================================
  // SECTION: Platform Dependencies (YouTube-specific)
  //==================================================
  private readonly apiUrl = `${environment.apiUrl}/api/youtube`;
  private readonly platformId = inject(PLATFORM_ID);
  constructor(private http: HttpClient) {}

  //==================================================
  // SECTION: Reactive State (YouTube-specific)
  //==================================================
  readonly playlists = signal<YouTubePlaylist[]>([]);              // user playlists
  readonly selectedPlaylist = signal<YouTubePlaylist | null>(null); // current playlist
  readonly playlistTracks = signal<YouTubePlaylistTrack[]>([]);     // tracks for selected playlist
  readonly isLoading = signal<boolean>(false);                      // network activity flag

  //==================================================
  // SECTION: Auth / Headers (Shared infra for YouTube API calls)
  //==================================================
  private getAuthHeaders(): HttpHeaders {
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (!isPlatformBrowser(this.platformId)) return base; // SSR / tests
    const token = localStorage.getItem('auth_token');
    return token ? base.set('Authorization', `Bearer ${token}`) : base;
  }

  //==================================================
  // SECTION: API Calls (YouTube-specific)
  //==================================================
  getUserPlaylists(): Observable<{ playlists: YouTubePlaylist[]; total: number }> {
    this.isLoading.set(true); // caller responsible for resetting via subscription completion
    return this.http.get<{ playlists: YouTubePlaylist[]; total: number }>(
      `${this.apiUrl}/playlists`,
      { headers: this.getAuthHeaders() }
    );
  }

  getPlaylistTracks(playlistId: string): Observable<{ tracks: YouTubePlaylistTrack[]; playlist_id: string; total: number }> {
    return this.http.get<{ tracks: YouTubePlaylistTrack[]; playlist_id: string; total: number }>(
      `${this.apiUrl}/playlists/${playlistId}/tracks`,
      { headers: this.getAuthHeaders() }
    );
  }

  //==================================================
  // SECTION: Loading Orchestration (YouTube-specific)
  //==================================================
  loadPlaylists(): void {
    this.isLoading.set(true);
    this.getUserPlaylists().subscribe({
      next: res => this.playlists.set(res.playlists),
      error: () => this.playlists.set([]),
      complete: () => this.isLoading.set(false)
    });
  }

  loadPlaylistTracks(playlistId: string): void {
    this.isLoading.set(true);
    this.getPlaylistTracks(playlistId).subscribe({
      next: res => this.playlistTracks.set(res.tracks),
      error: () => this.playlistTracks.set([]),
      complete: () => this.isLoading.set(false)
    });
  }

  //==================================================
  // SECTION: Selection & Conversion (Cross-platform adaptation)
  //==================================================
  selectPlaylist(pl: YouTubePlaylist): void {
    this.selectedPlaylist.set(pl);
    this.loadPlaylistTracks(pl.id);
  }

  convertTracksToSongs(): Song[] { // Produces normalized Song objects consumed by shared player
    return this.playlistTracks().map(t => ({
      id: t.id,
      name: t.title,
      artist: t.artist,
      duration: t.duration,
      video_url: t.video_url,
      thumbnail_url: t.thumbnail_url,
      isPlaceholder: false
    }));
  }



}

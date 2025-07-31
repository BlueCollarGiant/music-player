import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../music-player/Models/song.model';

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

@Injectable({
  providedIn: 'root'
})
export class YouTubeService {
  private readonly apiUrl = 'http://localhost:3000/api/youtube';
  private readonly platformId = inject(PLATFORM_ID);
  
  public readonly playlists = signal<YouTubePlaylist[]>([]);
  public readonly selectedPlaylist = signal<YouTubePlaylist | null>(null);
  public readonly playlistTracks = signal<YouTubePlaylistTrack[]>([]);
  public readonly isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  getUserPlaylists(): Observable<{ playlists: YouTubePlaylist[], total: number }> {
    this.isLoading.set(true);
    return this.http.get<{ playlists: YouTubePlaylist[], total: number }>(
      `${this.apiUrl}/playlists`, 
      { headers: this.getAuthHeaders() }
    );
  }

  getPlaylistTracks(playlistId: string): Observable<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }> {
    this.isLoading.set(true);
    return this.http.get<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }>(
      `${this.apiUrl}/playlists/${playlistId}/tracks`, 
      { headers: this.getAuthHeaders() }
    );
  }

  loadPlaylists(): void {
    this.getUserPlaylists().subscribe({
      next: (response) => {
        this.playlists.set(response.playlists);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.playlists.set([]);
      }
    });
  }

  loadPlaylistTracks(playlistId: string): void {
    this.getPlaylistTracks(playlistId).subscribe({
      next: (response) => {
        this.playlistTracks.set(response.tracks);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.playlistTracks.set([]);
      }
    });
  }

  selectPlaylist(playlist: YouTubePlaylist): void {
    this.selectedPlaylist.set(playlist);
    this.loadPlaylistTracks(playlist.id);
  }

  convertTracksToSongs(): Song[] {
    return this.playlistTracks().map((track) => ({
      id: track.id,
      name: track.title,
      artist: track.artist,
      duration: track.duration,
      video_url: track.video_url,
      thumbnail_url: track.thumbnail_url,
      isPlaceholder: false
    }));
  }
}

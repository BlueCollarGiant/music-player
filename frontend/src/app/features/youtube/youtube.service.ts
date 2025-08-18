import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class YouTubeService {
  private readonly apiUrl = `${environment.apiUrl}/api/youtube`;
  private readonly platformId = inject(PLATFORM_ID);

  public readonly playlists = signal<YouTubePlaylist[]>([]);
  public readonly selectedPlaylist = signal<YouTubePlaylist | null>(null);
  public readonly playlistTracks = signal<YouTubePlaylistTrack[]>([]);
  public readonly isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) { }

  //-----Private methods for API calls and headers-----//
  private getAuthHeaders(): HttpHeaders {
    const baseHeaders = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (!isPlatformBrowser(this.platformId)) {
      return baseHeaders;
    }

    const token = localStorage.getItem('auth_token');
    return token
      ? baseHeaders.set('Authorization', `Bearer ${token}`)
      : baseHeaders;
  }

  getUserPlaylists(): Observable<{ playlists: YouTubePlaylist[], total: number }> {
    this.isLoading.set(true);
    return this.http.get<{ playlists: YouTubePlaylist[], total: number }>(
      `${this.apiUrl}/playlists`,
      { headers: this.getAuthHeaders() }
    );
  }

  getPlaylistTracks(playlistId: string): Observable<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }> {
    return this.http.get<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }>(
      `${this.apiUrl}/playlists/${playlistId}/tracks`,
      { headers: this.getAuthHeaders() }
    );
  }

  loadPlaylists(): void {
    this.isLoading.set(true);

    this.getUserPlaylists().subscribe({
      next: (response) => {
        this.playlists.set(response.playlists);
      },
      error: () => {
        this.playlists.set([]);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadPlaylistTracks(playlistId: string): void {
    this.isLoading.set(true);

    this.getPlaylistTracks(playlistId).subscribe({
      next: (response) => {
        this.playlistTracks.set(response.tracks);
      },
      error: () => {
        this.playlistTracks.set([]);
      },
      complete: () => {
        this.isLoading.set(false);
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

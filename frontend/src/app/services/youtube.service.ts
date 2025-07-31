import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

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
}

@Injectable({
  providedIn: 'root'
})
export class YouTubeService {
  private apiUrl = 'http://localhost:3000/api/youtube';
  private platformId = inject(PLATFORM_ID);
  
  // Signals for reactive state management
  public playlists = signal<YouTubePlaylist[]>([]);
  public selectedPlaylist = signal<YouTubePlaylist | null>(null);
  public playlistTracks = signal<YouTubePlaylistTrack[]>([]);
  public isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  /**
   * Get authentication headers
   */
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

  /**
   * Fetch user's YouTube playlists from backend
   */
  getUserPlaylists(): Observable<{ playlists: YouTubePlaylist[], total: number }> {
    this.isLoading.set(true);
    const headers = this.getAuthHeaders();
    return this.http.get<{ playlists: YouTubePlaylist[], total: number }>(`${this.apiUrl}/playlists`, { headers });
  }

  /**
   * Fetch tracks from a specific YouTube playlist
   */
  getPlaylistTracks(playlistId: string): Observable<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }> {
    this.isLoading.set(true);
    const headers = this.getAuthHeaders();
    return this.http.get<{ tracks: YouTubePlaylistTrack[], playlist_id: string, total: number }>(`${this.apiUrl}/playlists/${playlistId}/tracks`, { headers });
  }

  /**
   * Load and set playlists
   */
  loadPlaylists(): void {
    this.getUserPlaylists().subscribe({
      next: (response) => {
        this.playlists.set(response.playlists);
        this.isLoading.set(false);
        console.log('✅ YouTube playlists loaded successfully:', response.playlists);
      },
      error: (error) => {
        console.error('❌ Error loading YouTube playlists:', error);
        this.isLoading.set(false);
        this.playlists.set([]); // Clear playlists on error
      }
    });
  }

  /**
   * Load tracks for a specific playlist
   */
  loadPlaylistTracks(playlistId: string): void {
    this.getPlaylistTracks(playlistId).subscribe({
      next: (response) => {
        console.log('📥 Raw YouTube tracks response:', response);
        console.log('🎵 First track details:', response.tracks[0]);
        this.playlistTracks.set(response.tracks);
        this.isLoading.set(false);
        console.log('✅ YouTube playlist tracks loaded successfully:', response.tracks);
      },
      error: (error) => {
        console.error('❌ Error loading playlist tracks:', error);
        this.isLoading.set(false);
        this.playlistTracks.set([]); // Clear tracks on error
      }
    });
  }

  /**
   * Select a playlist and load its tracks
   */
  selectPlaylist(playlist: YouTubePlaylist): void {
    this.selectedPlaylist.set(playlist);
    this.loadPlaylistTracks(playlist.id);
  }
}

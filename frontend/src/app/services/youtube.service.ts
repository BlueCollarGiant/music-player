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
      },
      error: (error) => {
        console.error('Error loading YouTube playlists:', error);
        this.isLoading.set(false);
        // Set some mock data for development
        this.setMockPlaylists();
      }
    });
  }

  /**
   * Load tracks for a specific playlist
   */
  loadPlaylistTracks(playlistId: string): void {
    this.getPlaylistTracks(playlistId).subscribe({
      next: (response) => {
        this.playlistTracks.set(response.tracks);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading playlist tracks:', error);
        this.isLoading.set(false);
        // Set some mock data for development
        this.setMockTracks();
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

  /**
   * Mock data for development (remove when backend is ready)
   */
  private setMockPlaylists(): void {
    const mockPlaylists: YouTubePlaylist[] = [
      {
        id: 'mock-1',
        title: 'My Favorites Mix',
        description: 'A collection of my favorite songs',
        video_count: 25
      },
      {
        id: 'mock-2',
        title: 'Chill Vibes',
        description: 'Relaxing music for focus and study',
        video_count: 18
      },
      {
        id: 'mock-3',
        title: 'Workout Hits',
        description: 'High energy music for exercising',
        video_count: 32
      }
    ];
    this.playlists.set(mockPlaylists);
  }

  /**
   * Mock tracks for development (remove when backend is ready)
   */
  private setMockTracks(): void {
    const mockTracks: YouTubePlaylistTrack[] = [
      {
        id: '1',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        duration: '3:53',
        video_url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8'
      },
      {
        id: '2', 
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        duration: '3:20',
        video_url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ'
      },
      {
        id: '3',
        title: 'Watermelon Sugar',
        artist: 'Harry Styles', 
        duration: '2:54',
        video_url: 'https://www.youtube.com/watch?v=E07s5ZYygMg'
      }
    ];
    this.playlistTracks.set(mockTracks);
  }
}

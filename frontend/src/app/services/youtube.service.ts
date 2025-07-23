import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoCount: number;
}

export interface YouTubePlaylistTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail?: string;
  videoId: string;
}

@Injectable({
  providedIn: 'root'
})
export class YouTubeService {
  private apiUrl = '/api/youtube';
  
  // Signals for reactive state management
  public playlists = signal<YouTubePlaylist[]>([]);
  public selectedPlaylist = signal<YouTubePlaylist | null>(null);
  public playlistTracks = signal<YouTubePlaylistTrack[]>([]);
  public isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  /**
   * Fetch user's YouTube playlists from backend
   */
  getUserPlaylists(): Observable<YouTubePlaylist[]> {
    this.isLoading.set(true);
    return this.http.get<YouTubePlaylist[]>(`${this.apiUrl}/playlists`);
  }

  /**
   * Fetch tracks from a specific YouTube playlist
   */
  getPlaylistTracks(playlistId: string): Observable<YouTubePlaylistTrack[]> {
    this.isLoading.set(true);
    return this.http.get<YouTubePlaylistTrack[]>(`${this.apiUrl}/playlists/${playlistId}/tracks`);
  }

  /**
   * Load and set playlists
   */
  loadPlaylists(): void {
    this.getUserPlaylists().subscribe({
      next: (playlists) => {
        this.playlists.set(playlists);
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
      next: (tracks) => {
        this.playlistTracks.set(tracks);
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
        videoCount: 25
      },
      {
        id: 'mock-2',
        title: 'Chill Vibes',
        description: 'Relaxing music for focus and study',
        videoCount: 18
      },
      {
        id: 'mock-3',
        title: 'Workout Hits',
        description: 'High energy music for exercising',
        videoCount: 32
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
        videoId: 'JGwWNGJdvx8'
      },
      {
        id: '2', 
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        duration: '3:20',
        videoId: '4NRXx6U8ABQ'
      },
      {
        id: '3',
        title: 'Watermelon Sugar',
        artist: 'Harry Styles', 
        duration: '2:54',
        videoId: 'E07s5ZYygMg'
      }
    ];
    this.playlistTracks.set(mockTracks);
  }
}

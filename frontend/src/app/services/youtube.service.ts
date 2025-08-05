import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
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


  //-----Playback signals for player state-----//

  public readonly currentTime = signal(0);
  public readonly duration = signal(0);
  public readonly isPlaying = signal(false);
  public readonly progress = computed(() => {
    const duration = this.duration();
    return duration ? (this.currentTime() / duration) * 100 : 0;
  });


  // --- ADDED: YouTube IFrame API instance & timer ---
  private player: any = null;        // Holds the actual YouTube Player
  private playerInterval: any = null; // Interval for polling playback time

  
  //-----Private methods for API calls and headers-----//
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

  // === ADDED: Playback Control Methods for MusicPlayerService ===

  /**
   * Initializes or loads the YouTube IFrame API player.
   * @param elementId The DOM id to mount the player into.
   * @param videoId The YouTube video ID to load.
   */
  initPlayer(elementId: string, videoId: string) {
    // If there's already a player, destroy it to avoid leaks.
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    this.player = new (window as any).YT.Player(elementId, {
      videoId,
      events: {
        'onReady': (e: any) => this.onPlayerReady(e),
        'onStateChange': (e: any) => this.onPlayerStateChange(e),
      }
    });
  }

  // --- Called by YouTube API when player is ready
  private onPlayerReady(event: any) {
    this.duration.set(this.player.getDuration());
    this.trackTime(); // Start polling the player for updates
  }

  // --- Called on YouTube player state change (play, pause, ended)
  private onPlayerStateChange(event: any) {
    // 1: playing, 2: paused, 0: ended
    if (event.data === 1) { // Playing
      this.isPlaying.set(true);
      this.trackTime();
    } else {
      this.isPlaying.set(false);
      this.stopTracking();
    }
  }

  // --- Starts an interval to poll the player for time/duration updates
  private trackTime() {
    this.stopTracking();
    this.playerInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime && this.player.getDuration) {
        this.currentTime.set(this.player.getCurrentTime());
        this.duration.set(this.player.getDuration());
      }
    }, 250); // Update every 250ms for smooth progress bar
  }

  // --- Clears the polling interval (on pause or destroy)
  private stopTracking() {
    if (this.playerInterval) clearInterval(this.playerInterval);
    this.playerInterval = null;
  }

  // --- Playback controls called by MusicPlayerService/UI ---
  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  seekTo(percent: number) {
    const dur = this.duration();
    if (dur && this.player?.seekTo) {
      this.player.seekTo((percent / 100) * dur, true);
    }
  }

}

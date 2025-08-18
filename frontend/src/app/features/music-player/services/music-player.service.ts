import { Injectable, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Song } from '../../../shared/models/song.model';
import { YouTubeService, YouTubePlaylistTrack } from '../../youtube/youtube.service';
import { SpotifyService } from '../../spotify/spotify.service';
import { SpotifyPlaybackService } from '../../spotify/spotify-playback.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  //-----Dependency Injection-----//
  private readonly sanitizer = inject(DomSanitizer);
  private readonly youtubeService = inject(YouTubeService);
  private readonly spotifyService = inject(SpotifyService);
  private readonly spotifyPlayback = inject(SpotifyPlaybackService);

  //-----Private Properties-----//
  private youtubePlayer: any = null;
  private audioEl?: HTMLAudioElement;

  //-----Navigation State-----//
  readonly activeTab = signal<string>('Songs');
  readonly tabs: readonly string[] = ['Songs', 'Albums', 'Artists', 'Genres'] as const;

  //-----Playback State-----//
  readonly isPlaying = signal<boolean>(false);
  readonly currentProgress = signal<number>(0);
  readonly currentTime = signal<string>('0:00');
  readonly currentTrack = signal<Song | null>(null);

  //-----Audio Visualizer-----//
  readonly audioBars = signal<number[]>(
    Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)))
  );

  //-----Navigation Methods-----//
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  //-----Unified Track Navigation-----//
  goToNextTrack(): void {
    const current = this.currentTrack();
    if (!current) return;
    if (current.platform === 'spotify') {
  // Auto-advance disabled for Spotify per requirements – do nothing.
  return;
    } else {
      const tracks = this.youtubeService.playlistTracks();
      if (!tracks.length) return;
      const idx = tracks.findIndex(t => t.id === current.id);
      const nextIdx = idx !== -1 ? (idx + 1) % tracks.length : 0;
      const next = tracks[nextIdx];
      if (next) this.selectTrack(this.convertYouTubeTrackToSong(next));
    }
  }

  goToPreviousTrack(): void {
    const current = this.currentTrack();
    if (!current) return;
    if (current.platform === 'spotify') {
      const tracks = this.spotifyService.playlistTracks();
      if (!tracks.length) return;
      const idx = tracks.findIndex(t => t.id === current.id);
      const prevIdx = idx > 0 ? idx - 1 : tracks.length - 1;
      const prev = tracks[prevIdx];
      if (prev) {
        const song = this.spotifyService.toSong(prev);
        (song as any).platform = 'spotify';
        this.selectTrack(song);
      }
    } else {
      const tracks = this.youtubeService.playlistTracks();
      if (!tracks.length) return;
      const idx = tracks.findIndex(t => t.id === current.id);
      const prevIdx = idx > 0 ? idx - 1 : tracks.length - 1;
      const prev = tracks[prevIdx];
      if (prev) this.selectTrack(this.convertYouTubeTrackToSong(prev));
    }
  }

  private convertYouTubeTrackToSong(track: YouTubePlaylistTrack): Song {
    return {
      id: track.id,
      name: track.title,
      artist: track.artist,
      duration: track.duration,
      video_url: track.video_url,
      thumbnail_url: track.thumbnail_url,
      isPlaceholder: false,
    };
  }

  //-----Playback Control Methods-----//
  togglePlayPause(): void {
    const track = this.currentTrack();
    if (!track) return;
    if (track.platform === 'spotify') {
  // Coordinator manages toggle; no direct action here now.
      return;
    }
    const nowPlaying = !this.isPlaying();
    this.isPlaying.set(nowPlaying);
  }

  seekTo(percentage: number): void {
    const track = this.currentTrack();
    if (track?.platform === 'spotify' && this.audioEl) {
      const target = Math.max(0, Math.min(100, percentage));
      const dur = this.audioEl.duration || 30;
      this.audioEl.currentTime = (target / 100) * dur;
      this.currentProgress.set(target);
      return;
    }
    this.currentProgress.set(Math.max(0, Math.min(100, percentage)));
  }

  selectTrack(song: Song): void {
    if (!song.isPlaceholder) {
      this.currentTrack.set(song);
      // stop any existing spotify audio
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      }
      this.isPlaying.set(false);      
    }
  }

  // Unified play entry
  playCurrent() {
    const t = this.currentTrack();
    if (!t) return;
    if (t.platform === 'spotify') {
  // Coordinator will invoke load/start; nothing here
      return;
    }
    // YouTube handled via playback coordinator
    this.isPlaying.set(true);
  }

  pause() {
    const t = this.currentTrack();
    if (t?.platform === 'spotify') {
  this.spotifyPlayback.pause().catch(()=>{});
  this.audioEl?.pause();
  this.isPlaying.set(false);
      return;
    }
    this.isPlaying.set(false);
  }

  private playSpotifyPreview(url: string) {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.addEventListener('ended', () => this.isPlaying.set(false));
      this.audioEl.addEventListener('timeupdate', () => {
        if (!this.audioEl) return;
        const dur = this.audioEl.duration || 30;
        if (dur > 0) {
          const pct = (this.audioEl.currentTime / dur) * 100;
          this.updateProgress(pct, this.audioEl.currentTime);
        }
      });
    }
    try {
      this.audioEl.src = url;
      this.audioEl.currentTime = 0;
      this.audioEl.play().then(() => this.isPlaying.set(true)).catch(() => this.isPlaying.set(false));
    } catch {
      this.isPlaying.set(false);
    }
  }

  //-----YouTube Helper Methods (Unified)-----//
  getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match?.[1] ?? null;
  }

  hasYouTubeVideo(url: string | undefined): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    const videoId = this.getYouTubeId(url);
    if (!videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVideoEmbedUrl(url: string): SafeResourceUrl | null {
    const videoId = this.getYouTubeId(url);
    if (!videoId) return null;
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}&autoplay=1&controls=1&modestbranding=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getDurationInSeconds(duration: string): number {
    if (!duration) return 0;
    
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  }

  //-----Time Management Methods-----//
  updateCurrentTime(currentSeconds: number): void {
    if (typeof currentSeconds === 'number' && !isNaN(currentSeconds)) {
      this.currentTime.set(this.formatTime(currentSeconds));
    }
  }

  //-----Methods for PlaybackCoordinator Integration-----//
  setYouTubePlayer(player: any): void {
    this.youtubePlayer = player;
  }

  updateDuration(durationSeconds: number): void {
    // Convert seconds to MM:SS format and update current track duration if needed
    const formattedDuration = this.formatTime(durationSeconds);
    const track = this.currentTrack();
    if (track && (!track.duration || track.duration === '0:00')) {
      // Update the track duration if it's not set
      this.currentTrack.set({
        ...track,
        duration: formattedDuration
      });
    }
  }

  setPlayingState(playing: boolean): void {
    this.isPlaying.set(playing);
  }

  updateProgress(percentage: number, currentSeconds: number): void {
    this.currentProgress.set(Math.max(0, Math.min(100, percentage)));
    this.updateCurrentTime(currentSeconds);
  }

  //-----Private Helper Methods-----//
  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Removed legacy ensureSpotify* helpers – coordinator + spotifyPlayback.handle unified API now.

  private authHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Song } from '../../../shared/models/song.model';
import { YouTubeService, YouTubePlaylistTrack } from '../../youtube/youtube.service';
import { SpotifyService } from './spotify.service';
import { SpotifyPlaybackService } from './spotify-playback.service';
import { environment } from '../../../../environments/environment';
import { formatTime } from '../../../shared/utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  //==================================================
  // SECTION: Dependency Injection
  //==================================================
  private readonly sanitizer = inject(DomSanitizer);
  private readonly youtubeService = inject(YouTubeService);
  private readonly spotifyService = inject(SpotifyService);
  private readonly spotifyPlayback = inject(SpotifyPlaybackService);

  //==================================================
  // SECTION: Shared Reactive State (Cross-platform)
  //==================================================
  readonly activeTab = signal<string>('Songs');
  readonly tabs: readonly string[] = ['Songs', 'Albums', 'Artists', 'Genres'] as const;

  readonly isPlaying = signal<boolean>(false);               // current unified playing state
  readonly currentProgress = signal<number>(0);              // percent (0-100)
  readonly currentTime = signal<string>('0:00');             // formatted time (MM:SS)
  readonly currentTrack = signal<Song | null>(null);         // normalized track (platform tagged externally)
  readonly audioBars = signal<number[]>(                    // simple visualizer placeholder
    Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)))
  );

  //==================================================
  // SECTION: YouTube-specific State & Methods
  //==================================================
  private youtubePlayer: any = null; // raw YouTube player instance (coordinator sets)

  setYouTubePlayer(player: any): void { this.youtubePlayer = player; }

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
    if (!videoId) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVideoEmbedUrl(url: string): SafeResourceUrl | null {
    const videoId = this.getYouTubeId(url);
    if (!videoId) return null;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}&autoplay=1&controls=1&modestbranding=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getDurationInSeconds(duration: string): number { // TODO: Could be generalized; currently only used for YouTube durations.
    if (!duration) return 0;
    const parts = duration.split(':');
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    return 0;
  }

  //==================================================
  // SECTION: Spotify-specific State & Methods
  //==================================================
  private audioEl?: HTMLAudioElement; // used for Spotify 30s preview playback

  private playSpotifyPreview(url: string) { // preview playback only (not full track stream)
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

  //==================================================
  // SECTION: Shared Playback Control (Cross-platform semantics)
  //==================================================

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
    if (song.isPlaceholder) return;
    this.currentTrack.set(song);
    // Stop any existing Spotify preview audio on track switch
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.isPlaying.set(false);
  }

  playCurrent(): void { // entry point from UI
    const t = this.currentTrack();
    if (!t) return;
    if (t.platform === 'spotify') {
      // Coordinator loads & starts via Spotify playback service.
      return;
    }
    // YouTube handled via playback coordinator; we mirror state only.
    this.isPlaying.set(true);
  }

  pause(): void {
    const t = this.currentTrack();
    if (t?.platform === 'spotify') {
      this.spotifyPlayback.pause().catch(() => {});
      this.audioEl?.pause();
      this.isPlaying.set(false);
      return;
    }
    this.isPlaying.set(false);
  }

  //==================================================
  // SECTION: Cross-platform Track Navigation
  //==================================================
  goToNextTrack(): void {
    const current = this.currentTrack();
    if (!current) return;
    if (current.platform === 'spotify') {
      // Auto-advance disabled for Spotify per requirements – intentionally no-op.
      return;
    }
    const tracks = this.youtubeService.playlistTracks();
    if (!tracks.length) return;
    const idx = tracks.findIndex(t => t.id === current.id);
    const nextIdx = idx !== -1 ? (idx + 1) % tracks.length : 0;
    const next = tracks[nextIdx];
    if (next) this.selectTrack(this.convertYouTubeTrackToSong(next));
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
      return;
    }
    const tracks = this.youtubeService.playlistTracks();
    if (!tracks.length) return;
    const idx = tracks.findIndex(t => t.id === current.id);
    const prevIdx = idx > 0 ? idx - 1 : tracks.length - 1;
    const prev = tracks[prevIdx];
    if (prev) this.selectTrack(this.convertYouTubeTrackToSong(prev));
  }

  //==================================================
  // SECTION: UI / Navigation Helpers (Shared)
  //==================================================
  setActiveTab(tab: string): void { this.activeTab.set(tab); }
  setPlayingState(playing: boolean): void { this.isPlaying.set(playing); }

  //==================================================
  // SECTION: Time & Progress Helpers (Shared)
  //==================================================
  updateProgress(percentage: number, currentSeconds: number): void {
    this.currentProgress.set(Math.max(0, Math.min(100, percentage)));
    this.updateCurrentTime(currentSeconds);
  }

  updateCurrentTime(currentSeconds: number): void {
    if (typeof currentSeconds === 'number' && !isNaN(currentSeconds)) {
      this.currentTime.set(formatTime(currentSeconds));
    }
  }

  updateDuration(durationSeconds: number): void {
    const formattedDuration = formatTime(durationSeconds);
    const track = this.currentTrack();
    if (track && (!track.duration || track.duration === '0:00')) {
      this.currentTrack.set({ ...track, duration: formattedDuration });
    }
  }

  //==================================================
  // SECTION: Misc Helpers (Shared)
  //==================================================
  private authHeader(): HeadersInit { // TODO: Currently unused; remove if not required later.
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }
}

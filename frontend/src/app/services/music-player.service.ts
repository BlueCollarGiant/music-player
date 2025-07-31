import { Injectable, signal, inject } from '@angular/core';
import { Song } from '../music-player/Models/song.model';
import { PlayListLogic } from './play-list-logic.service';
import { TimeService } from './time.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  private youtubePlayer: any = null;
  private sanitizer = inject(DomSanitizer);
  readonly playbackStarted = signal(false);
  //inject time service
  private timeService = inject(TimeService);
  // Tabs for nav-bar
  activeTab = signal<string>('Songs');
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Playback needed by player-controls
  readonly isPlaying = signal<boolean>(false);
  currentProgress = signal<number>(0);
  currentTime = signal<string>('0:00');
  private intervalRef: any = null;


  // Song Library Core data for main-body look in data folder for data
  private playlist = inject(PlayListLogic);



  // Current Track - Initialize with first song if available
  currentTrack = signal<Song | null>(this.playlist.displaySongList()[0] ?? null);

  // Audio Visualizer Bars
  audioBars = signal<number[]>(Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100))));


  // Methods


  // Remove the complex YouTube player integration
  // The new approach uses simple embed iframes
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  togglePlayPause(): void {
    const nowPlaying = !this.isPlaying();
    this.isPlaying.set(nowPlaying);
    
    if (nowPlaying && this.currentTrack()?.video_url) {
      // For YouTube videos, the iframe will handle playback
      // We just need to track the playing state
      this.startProgressBar();
    } else if (nowPlaying) {
      // For audio-only tracks
      this.startProgressBar();
    } else {
      // Pause - clear progress tracking
      clearInterval(this.intervalRef);
    }
  }
private startProgressBar(): void {
  const song = this.currentTrack();
  if (!song || !song.duration) return;

  // Don't start fake progress if YouTube player is controlling this track
  if (this.youtubePlayer && song.video_url) {
    return; // YouTube player handles progress tracking
  }

  const totalSeconds = this.durationToSeconds(song.duration);
  if (totalSeconds <= 0) return;

  const startingPercent = this.currentProgress();
  let elapsed = (startingPercent / 100) * totalSeconds;

  clearInterval(this.intervalRef); // clear any existing timer

  this.intervalRef = setInterval(() => {
    elapsed += 0.1;

    const percent = Math.min((elapsed / totalSeconds) * 100, 100);
    this.currentProgress.set(percent);

    if (percent >= 100) {
      clearInterval(this.intervalRef); // stop at full
      this.isPlaying.set(false); // auto-pause when song ends
      this.nextSong(); // auto-advance to next song
    }
  }, 100);
}
  seekTo(percentage: number): void {
  if (this.youtubePlayer && this.currentTrack()?.video_url) {
    try {
      if (typeof this.youtubePlayer.getDuration === 'function' && typeof this.youtubePlayer.seekTo === 'function') {
        const duration = this.youtubePlayer.getDuration();
        const seekTime = (percentage / 100) * duration;
        this.youtubePlayer.seekTo(seekTime, true);
        this.currentProgress.set(percentage);
      } else {
        console.error('❌ YouTube player seek methods not available');
        this.currentProgress.set(percentage);
      }
    } catch (error) {
      console.error('❌ Error seeking YouTube video:', error);
      this.currentProgress.set(percentage);
    }
  } else {
    // Fallback for audio-only tracks
    this.currentProgress.set(percentage);
  }
}
  private durationToSeconds(duration: string): number {
    const [h, m, s] = duration.split(':').map(n => parseInt(n, 10) || 0);
    return h * 3600 + m * 60 + s;
  }

  previousSong(): void {
  const tracks = this.playlist.displaySongList().filter(song => !song.isPlaceholder);
  const current = this.currentTrack();

  if (!current) return;

  const currentIndex = tracks.findIndex(song => song.id === current.id);
  let prevIndex = currentIndex - 1;

  if (prevIndex < 0) {
    prevIndex = tracks.length - 1;
  }

  const prevSong = tracks[prevIndex];
  if (prevSong) {
    this.currentTrack.set(prevSong);
    this.timeService.parseTime(prevSong.duration);
    this.currentProgress.set(0);
    this.currentTime.set('0:00');
    
    // Stop YouTube player if it exists
    if (this.youtubePlayer) {
      this.youtubePlayer.stopVideo();
    }
    
    // Clear audio intervals  
    clearInterval(this.intervalRef);
    this.isPlaying.set(false);
  }
  }

  //fix this it should mirror previous song
  nextSong(): void {
  const tracks = this.playlist.displaySongList().filter(song => !song.isPlaceholder);
  const current = this.currentTrack();

  if(!current && tracks.length > 0) {
    this.currentTrack.set(tracks[0]);
  }

  if (!current) return;

  const currentIndex = tracks.findIndex(song => song.id === current.id);
  let nextIndex = currentIndex + 1;

  if (nextIndex >= tracks.length) {
    nextIndex = 0;
  }
  
  const nextSong = tracks[nextIndex];
  if (nextSong) {
    this.currentTrack.set(nextSong);
    this.timeService.parseTime(nextSong.duration);
    this.currentProgress.set(0);
    this.currentTime.set('0:00');
    
    // Stop YouTube player if it exists
    if (this.youtubePlayer) {
      this.youtubePlayer.stopVideo();
    }
    
    // Clear audio intervals
    clearInterval(this.intervalRef);
    this.isPlaying.set(false);
  }
  }
  play(): void {
    this.playbackStarted.set(true);
  }

  pause(): void {
    this.playbackStarted.set(false);
  }
    // In your Song model or in the service:
  getYouTubeId(url: string): string | null {
    // Handles both normal and share URLs
    if (!url) return null;
    const idMatch = url.match(/v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
    return idMatch ? idMatch[1] : null;
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

  // Helper method to format seconds to time string
  private formatTime(seconds: number): string {
    // Handle invalid numbers
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Method to update current time (called from right panel)
  updateCurrentTime(currentSeconds: number): void {
    // Validate input before formatting
    if (typeof currentSeconds === 'number' && !isNaN(currentSeconds)) {
      this.currentTime.set(this.formatTime(currentSeconds));
    }
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Song } from '../music-player/Models/song.model';
import { PlayListLogic } from './play-list-logic.service';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  //-----Dependency Injection-----//
  private readonly sanitizer = inject(DomSanitizer);
  private readonly playlist = inject(PlayListLogic);

  //-----Private Properties-----//
  private youtubePlayer: any = null;
  private intervalRef: number | null = null;

  //-----Navigation State-----//
  readonly activeTab = signal<string>('Songs');
  readonly tabs: readonly string[] = ['Songs', 'Albums', 'Artists', 'Genres'] as const;

  //-----Playback State-----//
  readonly isPlaying = signal<boolean>(false);
  readonly currentProgress = signal<number>(0);
  readonly currentTime = signal<string>('0:00');
  readonly currentTrack = signal<Song | null>(this.playlist.displaySongList()[0] ?? null);

  //-----Audio Visualizer-----//
  readonly audioBars = signal<number[]>(
    Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)))
  );

  //-----Navigation Methods-----//
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  //-----Playback Control Methods-----//
  togglePlayPause(): void {
    const nowPlaying = !this.isPlaying();
    this.isPlaying.set(nowPlaying);
    
    if (nowPlaying && this.currentTrack()?.video_url) {
      this.startProgressBar();
    } else if (nowPlaying) {
      this.startProgressBar();
    } else {
      this.clearProgressInterval();
    }
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
          this.currentProgress.set(percentage);
        }
      } catch {
        this.currentProgress.set(percentage);
      }
    } else {
      this.currentProgress.set(percentage);
    }
  }

  seekToFromProgressBar(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    this.seekTo(clampedPercentage);
  }

  selectTrack(song: Song): void {
    if (!song.isPlaceholder) {
      this.currentTrack.set(song);
      this.currentProgress.set(0);
      this.currentTime.set('0:00');
      this.isPlaying.set(false);
      this.clearProgressInterval();
    }
  }

  //-----Track Navigation Methods-----//
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
      this.currentProgress.set(0);
      this.currentTime.set('0:00');
      
      if (this.youtubePlayer) {
        this.youtubePlayer.stopVideo();
      }
      
      this.clearProgressInterval();
      this.isPlaying.set(false);
    }
  }

  /*nextSong(): void {
  const tracks = this.playlist.displaySongList().filter(song => !song.isPlaceholder);
  
  if (tracks.length === 0) return;
  
  const current = this.currentTrack();
  let nextIndex = 0;

  if (current) {
    const currentIndex = tracks.findIndex(song => song.id === current.id);
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
  }
  
  const nextSong = tracks[nextIndex];
  if (!nextSong?.video_url) return;

  // Update current track and reset progress
  this.currentTrack.set(nextSong);
  this.currentProgress.set(0);
  this.currentTime.set('0:00');
  
  // Handle YouTube player
  if (this.youtubePlayer) {
    this.youtubePlayer.stopVideo();
    
    const videoId = this.extractVideoId(nextSong.video_url);
    if (videoId) {
      this.youtubePlayer.loadVideoById(videoId);
      this.youtubePlayer.playVideo();
    }
  }
  
  this.clearProgressInterval();
  this.isPlaying.set(true);
}

private extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match?.[1] ?? null;
}*/

nextSong(): void {
  console.log('nextSong() called');
  
  // Debug the playlist state
  const allSongs = this.playlist.displaySongList();
  console.log('All songs in playlist:', allSongs);
  console.log('Playlist length:', allSongs.length);
  
  const tracks = allSongs.filter(song => !song.isPlaceholder);
  console.log('Available tracks (non-placeholder):', tracks);
  console.log('Available tracks count:', tracks.length);
  
  if (tracks.length === 0) {
    console.log('No tracks available - playlist might be empty or all placeholders');
    return;
  }
  
  const current = this.currentTrack();
  console.log('Current track:', current);
  
  let nextIndex = 0;
  if (current) {
    const currentIndex = tracks.findIndex(song => song.id === current.id);
    console.log('Current index:', currentIndex);
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
  }
  
  console.log('Next index:', nextIndex);
  const nextSong = tracks[nextIndex];
  console.log('Next song:', nextSong);
  
  if (!nextSong?.video_url) {
    console.log('No video URL found');
    return;
  }

  this.currentTrack.set(nextSong);
  console.log('Updated current track');
  
  if (this.youtubePlayer) {
    console.log('YouTube player exists, extracting video ID');
    const videoId = this.extractVideoId(nextSong.video_url);
    console.log('Video ID:', videoId);
    
    if (videoId) {
      this.youtubePlayer.stopVideo();
      this.youtubePlayer.loadVideoById(videoId);
      this.youtubePlayer.playVideo();
      console.log('Started playing new video');
    }
  } else {
    console.log('No YouTube player found!');
  }
  
  this.isPlaying.set(true);
}
  private extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match?.[1] ?? null;
}
  //-----YouTube Helper Methods-----//
  getYouTubeId(url: string): string | null {
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

  //-----Private Helper Methods-----//
  private startProgressBar(): void {
    const song = this.currentTrack();
    if (!song || !song.duration) return;

    if (this.youtubePlayer && song.video_url) {
      return;
    }

    const totalSeconds = this.durationToSeconds(song.duration);
    if (totalSeconds <= 0) return;

    const startingPercent = this.currentProgress();
    let elapsed = (startingPercent / 100) * totalSeconds;

    this.clearProgressInterval();

    this.intervalRef = window.setInterval(() => {
      elapsed += 0.1;

      const percent = Math.min((elapsed / totalSeconds) * 100, 100);
      this.currentProgress.set(percent);

      if (percent >= 100) {
        this.clearProgressInterval();
        this.isPlaying.set(false);
        this.nextSong();
      }
    }, 100);
  }

  private clearProgressInterval(): void {
    if (this.intervalRef !== null) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private durationToSeconds(duration: string): number {
    const [h, m, s] = duration.split(':').map(n => parseInt(n, 10) || 0);
    return h * 3600 + m * 60 + s;
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

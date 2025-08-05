import { Injectable, inject, signal, linkedSignal } from '@angular/core';
import { MusicPlayerService } from './music-player.service';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly musicPlayer = inject(MusicPlayerService);

  //-----Core State Signals-----//
  private readonly youtubePlayerSignal = signal<any>(null);
  private readonly isPlayerReadySignal = signal<boolean>(false);
  private readonly timerTick = signal<number>(0);
  private timerInterval: number | null = null;

  //-----Public Reactive Signals for UI-----//
  readonly currentProgress = linkedSignal(() => {
    this.timerTick();
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        return duration > 0 ? (currentTime / duration) * 100 : 0;
      } catch {
        return 0;
      }
    }
    
    return this.musicPlayer.currentProgress();
  });

  readonly currentTime = linkedSignal(() => {
    this.timerTick(); // Dependency to trigger updates
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const seconds = player.getCurrentTime();
        return this.formatTime(seconds);
      } catch {
        return '0:00';
      }
    }
    return this.musicPlayer.currentTime();
  });

  readonly duration = linkedSignal(() => {
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const seconds = player.getDuration();
        return this.formatTime(seconds);
      } catch {
        return track?.duration || '0:00';
      }
    }
    return track?.duration || '0:00';
  });

  //-----YouTube Player Setup-----//
  setYouTubePlayer(player: any): void {
    if (!player) {
      this.isPlayerReadySignal.set(false);
    }
    
    this.youtubePlayerSignal.set(player);
    this.musicPlayer.setYouTubePlayer(player);
  }

  onPlayerReady(event: any): void {
    this.isPlayerReadySignal.set(true);
    const duration = event.target.getDuration();
    this.musicPlayer.updateDuration(duration);
  }

  onPlayerStateChange(event: any): void {
    const YT = (window as any).YT;
    if (!YT) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        this.musicPlayer.setPlayingState(true);
        this.startTimer();
        break;
      case YT.PlayerState.PAUSED:
        this.musicPlayer.setPlayingState(false);
        this.stopTimer();
        break;
      case YT.PlayerState.ENDED:
        this.musicPlayer.setPlayingState(false);
        this.stopTimer();
        // Auto-advance to next track
        this.musicPlayer.goToNextTrack();
        break;
    }
  }

  //-----Timer Management-----//
  private startTimer(): void {
    this.stopTimer();
    
    this.timerInterval = window.setInterval(() => {
      this.timerTick.update(tick => tick + 1);
    }, 500);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  //-----Playback Control-----//
  togglePlayPause(): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    
    if (!player || !isReady) {
      this.musicPlayer.togglePlayPause();
      return;
    }

    try {
      const playerState = player.getPlayerState();
      const YT = (window as any).YT;
      
      if (playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (error) {
      console.warn('Error controlling YouTube player:', error);
      this.musicPlayer.togglePlayPause();
    }
  }

  seekTo(percentage: number): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    
    if (!player || !isReady) {
      this.musicPlayer.seekTo(percentage);
      return;
    }

    try {
      const duration = player.getDuration();
      const seekTime = (percentage / 100) * duration;
      player.seekTo(seekTime, true);
      this.musicPlayer.updateProgress(percentage, seekTime);
    } catch (error) {
      console.warn('Error seeking YouTube player:', error);
      this.musicPlayer.seekTo(percentage);
    }
  }

  //-----Video Loading for Track Changes-----//
  loadVideoForCurrentTrack(): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    const track = this.musicPlayer.currentTrack();
    
    if (!player || !isReady || !track?.video_url) return;

    const videoId = this.musicPlayer.getYouTubeId(track.video_url);
    if (videoId) {
      try {
        player.loadVideoById(videoId);
      } catch (error) {
        console.warn('Error loading YouTube video:', error);
      }
    }
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
}

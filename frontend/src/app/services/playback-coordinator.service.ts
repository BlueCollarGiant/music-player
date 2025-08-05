import { Injectable, inject, signal, linkedSignal } from '@angular/core';
import { MusicPlayerService } from './music-player.service';
import { YouTubeService, YouTubePlaylistTrack } from './youtube.service';
import { Song } from '../music-player/Models/song.model';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly musicPlayer = inject(MusicPlayerService);
  private readonly youtubeService = inject(YouTubeService);

  //-----Core State Signals-----//
  private readonly youtubePlayerSignal = signal<any>(null);
  private readonly isPlayerReadySignal = signal<boolean>(false);
  private readonly timerTick = signal<number>(0);
  private timerInterval: number | null = null;

  //-----Public Reactive Signals for UI-----//
  readonly currentProgress = linkedSignal(() => {
    this.timerTick(); // Dependency to trigger updates
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    
    console.log('📊 Progress calculation:', {
      hasTrack: !!track?.video_url,
      hasPlayer: !!player,
      isReady: this.isPlayerReadySignal()
    });
    
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        console.log('📈 YouTube Progress:', progress.toFixed(1) + '%', `(${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s)`);
        return progress;
      } catch (error) {
        console.error('❌ YouTube API Error:', error);
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

  // Helper to convert YouTubePlaylistTrack to Song
  private toSong(track: YouTubePlaylistTrack): Song {
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

  //-----YouTube Player Setup-----//
  setYouTubePlayer(player: any): void {
    console.log('🎬 YouTube player set:', !!player);
    
    if (!player) {
      // Reset ready state when clearing player
      this.isPlayerReadySignal.set(false);
      console.log('🔄 Player cleared - resetting ready state');
    }
    
    this.youtubePlayerSignal.set(player);
    // Set up the player reference in MusicPlayerService for backward compatibility
    this.musicPlayer.setYouTubePlayer(player);
  }

  onPlayerReady(event: any): void {
    console.log('✅ YouTube player ready');
    this.isPlayerReadySignal.set(true);
    const duration = event.target.getDuration();
    this.musicPlayer.updateDuration(duration);
  }

  onPlayerStateChange(event: any): void {
    const YT = (window as any).YT;
    console.log('🎮 Player state change:', event.data);
    if (!YT) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        console.log('▶️ Video playing - starting timer');
        this.musicPlayer.setPlayingState(true);
        this.startTimer();
        break;
      case YT.PlayerState.PAUSED:
        console.log('⏸️ Video paused - stopping timer');
        this.musicPlayer.setPlayingState(false);
        this.stopTimer();
        break;
      case YT.PlayerState.ENDED:
        console.log('⏹️ Video ended - stopping timer');
        this.musicPlayer.setPlayingState(false);
        this.stopTimer();
        this.nextYouTubeSong();
        break;
    }
  }

  //-----Timer Management-----//
  private startTimer(): void {
    console.log('🎵 Timer started');
    this.stopTimer();
    
    this.timerInterval = window.setInterval(() => {
      // Increment timer to trigger linkedSignal updates
      this.timerTick.update(tick => tick + 1);
      console.log('⏰ Timer tick:', this.timerTick());
    }, 500); // Update every 500ms for smooth progress
  }

  private stopTimer(): void {
    console.log('⏹️ Timer stopped');
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


  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Navigation for YouTube playlists
  nextYouTubeSong(): void {
    const tracks = this.youtubeService.playlistTracks();
    const current = this.musicPlayer.currentTrack();
    if (!current) return;
    const currentIndex = tracks.findIndex(t => t.id === current.id);
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1];
      this.musicPlayer.selectTrack(this.toSong(nextTrack));
      this.loadYouTubeVideo(nextTrack.video_url);
    }
  }

  previousYouTubeSong(): void {
    const tracks = this.youtubeService.playlistTracks();
    const current = this.musicPlayer.currentTrack();
    if (!current) return;
    const currentIndex = tracks.findIndex(t => t.id === current.id);
    if (currentIndex > 0) {
      const prevTrack = tracks[currentIndex - 1];
      this.musicPlayer.selectTrack(this.toSong(prevTrack));
      this.loadYouTubeVideo(prevTrack.video_url);
    }
  }

  //-----Video Loading-----//
  private loadYouTubeVideo(videoUrl: string): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    
    if (!player || !isReady) return;

    const videoId = this.extractVideoId(videoUrl);
    if (videoId) {
      try {
        player.loadVideoById(videoId);
      } catch (error) {
        console.warn('Error loading YouTube video:', error);
      }
    }
  }

  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match?.[1] ?? null;
  }

  //-----Cleanup-----//
  destroy(): void {
    this.stopTimer();
    this.youtubePlayerSignal.set(null);
    this.isPlayerReadySignal.set(false);
  }
}

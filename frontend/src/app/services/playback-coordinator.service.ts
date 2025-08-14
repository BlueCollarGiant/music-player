import { Injectable, inject, signal, linkedSignal, effect } from '@angular/core';
import { MusicPlayerService } from './music-player.service';
import { SpotifyPlaybackService } from './spotify-playback.service';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly musicPlayer = inject(MusicPlayerService);
  private readonly spotifyPlayback = inject(SpotifyPlaybackService);

  //-----Core State Signals-----//
  private readonly youtubePlayerSignal = signal<any>(null);
  private readonly isPlayerReadySignal = signal<boolean>(false);
  private readonly timerTick = signal<number>(0);
  private timerInterval: number | null = null;

  //-----Spotify Timebase (mirrors YouTube logic but reuses SAME timer loop)-----//
  private readonly spotifyBasePositionMs = signal<number>(0); // position at last state event / seek
  private readonly spotifyDurationMs = signal<number>(0);
  private readonly spotifyLastUpdateTs = signal<number>(0); // epoch ms when base captured
  private readonly spotifyIsPlaying = signal<boolean>(false);
  private lastSpotifyTrackUri: string | null = null;

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

    // Spotify branch: compute based on timebase maintained from last SDK state event
    if (track?.platform === 'spotify') {
      const duration = this.spotifyDurationMs();
      if (duration > 0) {
        const base = this.spotifyBasePositionMs();
        const lastTs = this.spotifyLastUpdateTs();
        const playing = this.spotifyIsPlaying();
        let position = base;
        if (playing) {
          const elapsed = Date.now() - lastTs;
            position = base + elapsed; // optimistic progression until next SDK push
        }
        if (position > duration) position = duration;
        if (position < 0) position = 0;
        return (position / duration) * 100;
      }
      return 0;
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
    if (track?.platform === 'spotify') {
      const duration = this.spotifyDurationMs(); // ensure dependency
      const base = this.spotifyBasePositionMs();
      const lastTs = this.spotifyLastUpdateTs();
      const playing = this.spotifyIsPlaying();
      let position = base;
      if (playing) position = base + (Date.now() - lastTs);
      if (duration && position > duration) position = duration;
      return this.formatTime(position / 1000);
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
    if (track?.platform === 'spotify') {
      const ms = this.spotifyDurationMs();
      if (!ms) return '0:00';
      return this.formatTime(ms / 1000);
    }
    return track?.duration || '0:00';
  });

  //-----Effects: subscribe to Spotify SDK state via its signals-----//
  // We derive a coherent timebase (basePosition + timestamp) so we can smoothly advance with existing timer.
  private readonly spotifyStateEffect = effect(() => {
    const track = this.musicPlayer.currentTrack();
    if (track?.platform !== 'spotify') return; // only react when active track is spotify

    const sdkTrack = this.spotifyPlayback.track(); // triggers effect when SDK track updates
    const isPlaying = this.spotifyPlayback.isPlaying();
    const position = this.spotifyPlayback.progressMs();
    const duration = this.spotifyPlayback.durationMs();

    // Detect track change by uri (reset base position)
    const uri = sdkTrack?.uri || null;
    if (uri && uri !== this.lastSpotifyTrackUri) {
      this.lastSpotifyTrackUri = uri;
      this.spotifyBasePositionMs.set(0);
      this.spotifyLastUpdateTs.set(Date.now());
      this.spotifyDurationMs.set(duration || sdkTrack?.durationMs || 0);
    }

    // Update base timebase from latest state event
    if (typeof position === 'number') {
      this.spotifyBasePositionMs.set(position);
      this.spotifyLastUpdateTs.set(Date.now());
    }
    if (duration) this.spotifyDurationMs.set(duration);
    this.spotifyIsPlaying.set(isPlaying);

    // Mirror playing state into shared musicPlayer service so existing UI binding stays consistent
    this.musicPlayer.setPlayingState(isPlaying);

    // Start/stop shared timer loop (reuse YouTube timer instead of parallel interval)
    if (isPlaying) {
      this.startTimer();
    } else {
      // Only stop if no YouTube playback active either
      const ytActive = !!(this.youtubePlayerSignal() && this.isPlayerReadySignal());
      if (!ytActive) this.stopTimer();
    }
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
    const track = this.musicPlayer.currentTrack();

    // Spotify seek handling: convert percent -> ms, call SDK seek, optimistically update timebase
    if (track?.platform === 'spotify') {
      const clamped = Math.max(0, Math.min(100, percentage));
      const duration = this.spotifyDurationMs();
      if (duration > 0) {
        const targetMs = (clamped / 100) * duration;
  this.onExternalSeek(targetMs); // optimistic local update
  this.spotifyPlayback.seek(targetMs).catch(()=>{});
      }
      return;
    }
    
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

  // External seek (e.g., user drags progress bar or programmatic seek) updates the base time.
  // This mirrors how YouTube seek resets its internal clock: we store a base position and timestamp
  // so the shared timer loop can advance smoothly without waiting for the SDK to emit another state event.
  onExternalSeek(ms: number) {
    this.spotifyBasePositionMs.set(ms);
    this.spotifyLastUpdateTs.set(Date.now());
    this.timerTick.update(t => t + 1); // force UI recompute immediately
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

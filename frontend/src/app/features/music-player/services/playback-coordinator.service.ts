import { Injectable, inject, signal, linkedSignal, effect, DestroyRef, untracked } from '@angular/core';
import { MusicPlayerService } from './music-player.service';
import { SpotifyPlaybackService } from '../../spotify/spotify-playback.service';
import { formatTime } from '../../../shared/utils/time-format.util';
// TODO: Future step – refactor to depend on PlayerPort adapters instead of direct SpotifyPlaybackService.

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly musicPlayer = inject(MusicPlayerService);
  private readonly spotifyPlayback = inject(SpotifyPlaybackService);
  private readonly destroyRef = inject(DestroyRef);

  //-----Core State Signals-----//
  // Strongly type the subset of the YouTube IFrame API we actually use
  private readonly youtubePlayerSignal = signal<{
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(id: string): void;
  } | null>(null);
  private readonly isPlayerReadySignal = signal<boolean>(false);
  private readonly timerTick = signal<number>(0);
  private timerInterval: number | null = null;

  // High-resolution clock helper (falls back if performance not available, e.g., some test envs)
  private readonly now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  //-----Spotify derived timebase (kept minimal; driven by SDK state events)-----//
  private readonly spotifyBasePositionMs = signal<number>(0);
  private readonly spotifyDurationMs = signal<number>(0);
  private readonly spotifyLastUpdateTs = signal<number>(0);
  private readonly spotifyIsPlaying = signal<boolean>(false);
  private lastSpotifyTrackUri: string | null = null;

  // Helper to compute current spotify playback position deterministically based on last state event
  private computeSpotifyPositionMs(): number {
    const duration = this.spotifyDurationMs();
    if (!duration) return 0;
    let position = this.spotifyBasePositionMs();
    if (this.spotifyIsPlaying()) {
      position += this.now() - this.spotifyLastUpdateTs();
    }
    if (position < 0) position = 0;
    if (position > duration) position = duration;
    return position;
  }

  private resetSpotifyTimebase(): void {
    this.spotifyBasePositionMs.set(0);
    this.spotifyLastUpdateTs.set(this.now());
    this.spotifyDurationMs.set(0);
    this.lastSpotifyTrackUri = null;
  }

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
      if (!duration) return 0;
      const position = this.computeSpotifyPositionMs();
      return (position / duration) * 100;
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
        return formatTime(seconds);
      } catch {
        return '0:00';
      }
    }
    if (track?.platform === 'spotify') {
      const pos = this.computeSpotifyPositionMs();
      return formatTime(pos / 1000);
    }
    return this.musicPlayer.currentTime();
  });

  readonly duration = linkedSignal(() => {
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const seconds = player.getDuration();
        return formatTime(seconds);
      } catch {
        return track?.duration || '0:00';
      }
    }
    if (track?.platform === 'spotify') {
      const ms = this.spotifyDurationMs();
      if (!ms) return '0:00';
      return formatTime(ms / 1000);
    }
    return track?.duration || '0:00';
  });

  //-----Effects: subscribe to Spotify SDK state via its signals-----//
  // We derive a coherent timebase (basePosition + timestamp) so we can smoothly advance with existing timer.
  private readonly spotifyStateEffect = effect(() => {
    const track = this.musicPlayer.currentTrack();
    if (track?.platform !== 'spotify') {
      // Leaving spotify context; clear internal timebase so stale UI doesn't persist
      if (this.lastSpotifyTrackUri) this.resetSpotifyTimebase();
      return;
    }

    const sdkTrack = this.spotifyPlayback.track();
    const isPlaying = this.spotifyPlayback.isPlaying();
    const position = this.spotifyPlayback.progressMs();
    const duration = this.spotifyPlayback.durationMs();

    // Detect track change by uri (reset base position)
    const uri = sdkTrack?.uri || null;
    if (uri && uri !== this.lastSpotifyTrackUri) {
      this.lastSpotifyTrackUri = uri;
      this.spotifyBasePositionMs.set(0);
      this.spotifyLastUpdateTs.set(this.now());
      this.spotifyDurationMs.set(duration || (sdkTrack as any)?.durationMs || 0);
    }

    // Update base timebase from latest state event
    if (typeof position === 'number') {
      untracked(() => {
        this.spotifyBasePositionMs.set(position);
        this.spotifyLastUpdateTs.set(this.now());
      });
    }
  if (duration) this.spotifyDurationMs.set(duration);
  this.spotifyIsPlaying.set(isPlaying);

    // Mirror playing state into shared musicPlayer service so existing UI binding stays consistent
    this.musicPlayer.setPlayingState(isPlaying);

    // Start/stop shared timer loop (reuse YouTube timer instead of parallel interval)
  if (isPlaying) this.startTimer();
  else if (!(this.youtubePlayerSignal() && this.isPlayerReadySignal())) this.stopTimer();
  });

  //-----YouTube Player Setup-----//
  setYouTubePlayer(player: any): void {
    if (!player) {
      this.isPlayerReadySignal.set(false);
      this.stopTimer();
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
        // Keep existing auto-advance for YouTube only (Spotify disabled elsewhere)
        this.musicPlayer.goToNextTrack();
        break;
    }
  }

  //-----Timer Management-----//
  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;
    this.timerInterval = window.setInterval(() => {
      this.timerTick.update(tick => tick + 1);
    }, 400); // Slightly more frequent for smoother progress (still lightweight)
    // Cleanup if service ever destroyed (SSR tests / future module teardown)
    this.destroyRef.onDestroy(() => this.stopTimer());
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
    const track = this.musicPlayer.currentTrack();

    // Spotify path: rely entirely on SDK toggle after initial single-track start.
    if (track?.platform === 'spotify') {
      const playing = this.musicPlayer.isPlaying();
      if (playing) {
        this.spotifyPlayback.pause()
          .then(() => this.musicPlayer.setPlayingState(false))
          .catch(() => {});
        return;
      }
      const currentUri = this.spotifyPlayback.track()?.uri || null;
      const targetUri = track.id ? `spotify:track:${track.id}` : null;
      if (currentUri && targetUri && currentUri === targetUri) {
        this.spotifyPlayback.resume()
          .then(() => this.musicPlayer.setPlayingState(true))
          .catch(() => {});
      } else {
        this.spotifyPlayback.load(track as any)
          .then(() => this.spotifyPlayback.start())
          .then(() => this.musicPlayer.setPlayingState(true))
          .catch(() => {});
      }
      return;
    }
    
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
        this.onExternalSeek(targetMs);
        this.spotifyPlayback.seek(targetMs / 1000).catch(()=>{}); // API seeks in seconds
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
  onExternalSeek(ms: number): void {
    untracked(() => {
      this.spotifyBasePositionMs.set(ms);
      this.spotifyLastUpdateTs.set(this.now());
    });
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
}

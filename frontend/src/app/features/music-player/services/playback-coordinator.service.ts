import { Injectable, inject, signal, linkedSignal, effect, DestroyRef, untracked } from '@angular/core';
import { MusicPlayerService } from './music-player.service';
import { SpotifyPlaybackService } from '../../spotify/spotify-playback.service';
import { formatTime } from '../../../shared/utils/time-format.util';
// TODO: Future step – refactor to depend on PlayerPort adapters instead of direct SpotifyPlaybackService.

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  //==================================================
  // SECTION: Dependency Injection (Shared)
  //==================================================
  private readonly musicPlayer = inject(MusicPlayerService);
  private readonly spotifyPlayback = inject(SpotifyPlaybackService);
  private readonly destroyRef = inject(DestroyRef);

  // High-resolution clock helper (performance.now fallback safe for tests / SSR)
  private readonly now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  //==================================================
  // SECTION: Shared Timer & Clock State
  //==================================================
  private readonly timerTick = signal<number>(0);    // drives recomputation of derived progress/time signals
  private timerInterval: number | null = null;       // interval id

  //==================================================
  // SECTION: YouTube Player State & Setup (YouTube-specific)
  //==================================================
  // Subset of the IFrame API actually consumed (avoids heavy typing)
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
        // Keep existing auto-advance for YouTube only (Spotify auto-advance disabled elsewhere)
        this.musicPlayer.goToNextTrack();
        break;
    }
  }

  loadVideoForCurrentTrack(): void { // YouTube-specific track load
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    const track = this.musicPlayer.currentTrack();
    if (!player || !isReady || !track?.video_url) return;
    const videoId = this.musicPlayer.getYouTubeId(track.video_url);
    if (!videoId) return;
    try { player.loadVideoById(videoId); } catch (error) { console.warn('Error loading YouTube video:', error); }
  }

  //==================================================
  // SECTION: Spotify Timebase & State (Spotify-specific)
  //==================================================
  private readonly spotifyBasePositionMs = signal<number>(0); // last known position at timestamp
  private readonly spotifyDurationMs = signal<number>(0);     // current track duration
  private readonly spotifyLastUpdateTs = signal<number>(0);   // high-res timestamp when base position captured
  private readonly spotifyIsPlaying = signal<boolean>(false);
  private lastSpotifyTrackUri: string | null = null;

  private computeSpotifyPositionMs(): number { // deterministic extrapolation based on last state & clock
    const duration = this.spotifyDurationMs();
    if (!duration) return 0;
    let position = this.spotifyBasePositionMs();
    if (this.spotifyIsPlaying()) position += this.now() - this.spotifyLastUpdateTs();
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

  // Subscribe to Spotify SDK state and maintain extrapolation timebase
  private readonly spotifyStateEffect = effect(() => {
    const track = this.musicPlayer.currentTrack();
    if (track?.platform !== 'spotify') {
      if (this.lastSpotifyTrackUri) this.resetSpotifyTimebase();
      return;
    }
    const sdkTrack = this.spotifyPlayback.track();
    const isPlaying = this.spotifyPlayback.isPlaying();
    const position = this.spotifyPlayback.progressMs();
    const duration = this.spotifyPlayback.durationMs();
    const uri = sdkTrack?.uri || null;
    if (uri && uri !== this.lastSpotifyTrackUri) {
      this.lastSpotifyTrackUri = uri;
      this.spotifyBasePositionMs.set(0);
      this.spotifyLastUpdateTs.set(this.now());
      this.spotifyDurationMs.set(duration || (sdkTrack as any)?.durationMs || 0);
    }
    if (typeof position === 'number') {
      untracked(() => {
        this.spotifyBasePositionMs.set(position);
        this.spotifyLastUpdateTs.set(this.now());
      });
    }
    if (duration) this.spotifyDurationMs.set(duration);
    this.spotifyIsPlaying.set(isPlaying);
    this.musicPlayer.setPlayingState(isPlaying); // mirror for UI
    if (isPlaying) this.startTimer();
    else if (!(this.youtubePlayerSignal() && this.isPlayerReadySignal())) this.stopTimer();
  });

  //==================================================
  // SECTION: Derived UI Signals (Cross-platform)
  //==================================================
  readonly currentProgress = linkedSignal(() => {
    this.timerTick();
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        return duration > 0 ? (currentTime / duration) * 100 : 0;
      } catch { return 0; }
    }
    if (track?.platform === 'spotify') {
      const duration = this.spotifyDurationMs();
      if (!duration) return 0;
      const position = this.computeSpotifyPositionMs();
      return (position / duration) * 100;
    }
    return this.musicPlayer.currentProgress();
  });

  readonly currentTime = linkedSignal(() => {
    this.timerTick();
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try { return formatTime(player.getCurrentTime()); } catch { return '0:00'; }
    }
    if (track?.platform === 'spotify') return formatTime(this.computeSpotifyPositionMs() / 1000);
    return this.musicPlayer.currentTime();
  });

  readonly duration = linkedSignal(() => {
    const player = this.youtubePlayerSignal();
    const track = this.musicPlayer.currentTrack();
    if (track?.video_url && player && this.isPlayerReadySignal()) {
      try { return formatTime(player.getDuration()); } catch { return track?.duration || '0:00'; }
    }
    if (track?.platform === 'spotify') {
      const ms = this.spotifyDurationMs();
      return ms ? formatTime(ms / 1000) : '0:00';
    }
    return track?.duration || '0:00';
  });

  //==================================================
  // SECTION: Playback Control (Cross-platform)
  //==================================================
  togglePlayPause(): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    const track = this.musicPlayer.currentTrack();
    if (track?.platform === 'spotify') {
      const playing = this.musicPlayer.isPlaying();
      if (playing) {
        this.spotifyPlayback.pause().then(() => this.musicPlayer.setPlayingState(false)).catch(() => {});
        return;
      }
      const currentUri = this.spotifyPlayback.track()?.uri || null;
      const targetUri = track.id ? `spotify:track:${track.id}` : null;
      if (currentUri && targetUri && currentUri === targetUri) {
        this.spotifyPlayback.resume().then(() => this.musicPlayer.setPlayingState(true)).catch(() => {});
      } else {
        this.spotifyPlayback.load(track as any)
          .then(() => this.spotifyPlayback.start())
          .then(() => this.musicPlayer.setPlayingState(true))
          .catch(() => {});
      }
      return;
    }
    if (!player || !isReady) { this.musicPlayer.togglePlayPause(); return; }
    try {
      const playerState = player.getPlayerState();
      const YT = (window as any).YT;
      if (playerState === YT.PlayerState.PLAYING) player.pauseVideo(); else player.playVideo();
    } catch (error) {
      console.warn('Error controlling YouTube player:', error);
      this.musicPlayer.togglePlayPause();
    }
  }

  seekTo(percentage: number): void {
    const player = this.youtubePlayerSignal();
    const isReady = this.isPlayerReadySignal();
    const track = this.musicPlayer.currentTrack();
    if (track?.platform === 'spotify') {
      const clamped = Math.max(0, Math.min(100, percentage));
      const duration = this.spotifyDurationMs();
      if (duration > 0) {
        const targetMs = (clamped / 100) * duration;
        this.onExternalSeek(targetMs);
        this.spotifyPlayback.seek(targetMs / 1000).catch(() => {}); // Spotify seek expects seconds
      }
      return;
    }
    if (!player || !isReady) { this.musicPlayer.seekTo(percentage); return; }
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

  // External seek updates Spotify timebase so extrapolation continues smoothly
  onExternalSeek(ms: number): void {
    untracked(() => {
      this.spotifyBasePositionMs.set(ms);
      this.spotifyLastUpdateTs.set(this.now());
    });
    this.timerTick.update(t => t + 1);
  }

  //==================================================
  // SECTION: Timer Management (Shared Infrastructure)
  //==================================================
  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;
    this.timerInterval = window.setInterval(() => {
      this.timerTick.update(tick => tick + 1);
    }, 400);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  private stopTimer(): void {
    if (!this.timerInterval) return;
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
}

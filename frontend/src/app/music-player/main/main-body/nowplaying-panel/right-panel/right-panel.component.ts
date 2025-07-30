import { AfterViewInit, Component, effect, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';

declare global {
  interface Window {
    YT: {
      Player: any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('youtubePlayer') youtubePlayerRef!: ElementRef;
  musicService = inject(MusicPlayerService);

  // This is the YouTube player instance
  private player: any = null;
  private playerReady = false;


  constructor() {
    // Watch for track changes and update player
    effect(() => {
      const currentTrack = this.musicService.currentTrack();
      if (currentTrack?.video_url && this.playerReady) {
        this.loadVideo(currentTrack.video_url);
      }
    });

    // Initialize YouTube API if not already loaded
    this.initializeYouTubeAPI();
  }

  ngAfterViewInit() {
    // Player will be created once API is ready and view is initialized
  }

  ngOnDestroy() {
    if (this.player) {
      this.player.destroy();
    }
  }

  private initializeYouTubeAPI() {
    if (typeof window.YT !== 'undefined' && window.YT.Player) {
      this.createPlayer();
      return;
    }

    // Set up the callback for when API loads
    window.onYouTubeIframeAPIReady = () => {
      this.createPlayer();
    };
  }

  private createPlayer() {
    if (!this.youtubePlayerRef) return;

    this.player = new window.YT.Player(this.youtubePlayerRef.nativeElement, {
      width: '320',
      height: '180',
      playerVars: {
        controls: 0,        // Hide YouTube controls 
        disablekb: 1,       // Disable keyboard controls
        modestbranding: 1,  // Minimal YouTube branding
        rel: 0,             // Don't show related videos
        showinfo: 0         // Don't show video info
      },
      events: {
        onReady: () => {
          this.playerReady = true;
          this.musicService.setYouTubePlayer(this.player);
          
          // Load current track if available
          const currentTrack = this.musicService.currentTrack();
          if (currentTrack?.video_url) {
            this.loadVideo(currentTrack.video_url);
          }
        },
        onStateChange: (event: any) => {
          this.handlePlayerStateChange(event);
        }
      }
    });
  }

  private loadVideo(videoUrl: string) {
    const videoId = this.musicService.getYouTubeId(videoUrl);
    if (videoId && this.player && this.playerReady) {
      this.player.loadVideoById(videoId);
    }
  }

  private handlePlayerStateChange(event: any) {
    const YT = window.YT;
    
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        this.musicService.isPlaying.set(true);
        this.startProgressTracking();
        break;
      case YT.PlayerState.PAUSED:
        this.musicService.isPlaying.set(false);
        this.stopProgressTracking();
        break;
      case YT.PlayerState.ENDED:
        this.musicService.isPlaying.set(false);
        this.musicService.nextSong();
        break;
    }
  }

  private progressInterval: any = null;

  private startProgressTracking() {
    this.stopProgressTracking();
    
    this.progressInterval = setInterval(() => {
      if (this.player && this.playerReady) {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        
        if (duration > 0) {
          const progress = (currentTime / duration) * 100;
          this.musicService.currentProgress.set(progress);
        }
      }
    }, 1000);
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  get isPlaying() {
    return this.musicService.isPlaying();
  }
}

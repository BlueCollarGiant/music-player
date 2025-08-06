import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { PlaybackCoordinatorService } from '../../../services/playback-coordinator.service';
import { Song } from '../../Models/song.model';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('youtubePlayer', { static: false }) youtubePlayer!: ElementRef<HTMLDivElement>;
  
  //-----Injections-----//
  musicService = inject(MusicPlayerService);
  playbackCoordinator = inject(PlaybackCoordinatorService);

  //-----Computed Properties-----//
  readonly currentTrack = computed<Song | null>(() => this.musicService.currentTrack());
  readonly isPlaying = computed(() => this.musicService.isPlaying());
  readonly hasVideoUrl = computed(() => !!this.currentTrack()?.video_url);
  
  // Show video iframe when track has video URL (regardless of playing state)
  readonly showVideo = computed(() => {
    const track = this.currentTrack();
    return !!(track && track.video_url);
  });
  
  // Show thumbnail overlay when video exists but not playing
  readonly showThumbnailOverlay = computed(() => this.hasVideoUrl() && !this.isPlaying());
  
  // Show static thumbnail when no video URL
  readonly showStaticThumbnail = computed(() => {
    const track = this.currentTrack();
    return !!(track && !track.video_url);
  });

  readonly thumbnailUrl = computed(() => {
    const track = this.currentTrack();
    return track?.thumbnail_url || 'assets/images/thumbnail.png';
  });

  // Player state tracking
  private currentPlayer: any = null;
  private previousTrackId: string | null = null;

  constructor() {
    // Watch for TRACK changes only (not play state changes)
    effect(() => {
      const track = this.currentTrack();
      const trackId = track?.id || null;
      
      // Only recreate player when track actually changes
      if (trackId !== this.previousTrackId) {
        this.destroyCurrentPlayer();
        
        if (track?.video_url) {
          setTimeout(() => this.createYouTubePlayer(), 500);
        }
        
        this.previousTrackId = trackId;
      }
    });
  }

  ngAfterViewInit() {
    // Initial player creation if track already selected
    const currentTrack = this.currentTrack();
    if (currentTrack?.video_url) {
      this.previousTrackId = currentTrack.id;
      setTimeout(() => this.createYouTubePlayer(), 500);
    }
  }

  private createYouTubePlayer(): void {
  const track = this.currentTrack();
  const videoId = track?.video_url ? this.musicService.getYouTubeId(track.video_url) : null;
  
  if (!this.youtubePlayer?.nativeElement || !videoId || !(window as any).YT?.Player) {
    return;
  }

  this.currentPlayer = new (window as any).YT.Player(this.youtubePlayer.nativeElement, {
    videoId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: (event: any) => {
        this.playbackCoordinator.setYouTubePlayer(this.currentPlayer);
        this.playbackCoordinator.onPlayerReady(event);

        //force player resize
        this.forcePlayerResize();
      },
      onStateChange: (event: any) => {
        this.playbackCoordinator.onPlayerStateChange(event);
      }
    }
  });
}
  
private forcePlayerResize(): void {
  if (this.currentPlayer && this.youtubePlayer) {
    //get the container dimensions
    const container = this.youtubePlayer.nativeElement;
    //const rect = container.getBoundingClientRect();

    // Force the YouTube player to resize
    //if (this.currentPlayer.setSize) {
      //this.currentPlayer.setSize(rect.width, rect.height);
    //}
    
    // Also force the iframe directly
    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = '';
      iframe.style.top = '';
      iframe.style.left = '';
    }
  }
}


private destroyCurrentPlayer(): void {
    if (this.currentPlayer) {
      try {
        // Clear the player reference in the service first
        this.playbackCoordinator.setYouTubePlayer(null);
        
        // Stop the player before destroying
        if (typeof this.currentPlayer.stopVideo === 'function') {
          this.currentPlayer.stopVideo();
        }
        
        // Destroy the player
        if (typeof this.currentPlayer.destroy === 'function') {
          this.currentPlayer.destroy();
        }
      } catch (error) {
        // Silent fail
      } finally {
        this.currentPlayer = null;
      }
    }
  }

  //-----Event Handlers-----//
  onThumbnailClick(): void {
    // This should trigger play, not just toggle
    if (this.hasVideoUrl() && !this.isPlaying()) {
      this.playbackCoordinator.togglePlayPause(); // This will start playing
    }
  }

  ngOnDestroy() {
    this.destroyCurrentPlayer();
  }
}

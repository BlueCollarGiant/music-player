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
      
      console.log('🔍 Effect triggered:', { 
        newTrackId: trackId, 
        previousTrackId: this.previousTrackId,
        willDestroy: trackId !== this.previousTrackId 
      });
      
      // Only recreate player when track actually changes
      if (trackId !== this.previousTrackId) {
        console.log('💥 Destroying player for track change');
        this.destroyCurrentPlayer();
        
        if (track?.video_url) {
          console.log('🎬 Creating new player for track:', track.name);
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
      console.log('🎬 Initial player creation for:', currentTrack.name);
      this.previousTrackId = currentTrack.id;
      setTimeout(() => this.createYouTubePlayer(), 500);
    }
  }

  private createYouTubePlayer(): void {
    console.log('🔍 Attempting to create YouTube player...');
    
    if (!this.youtubePlayer?.nativeElement) {
      console.log('❌ No div element found - div may not be in DOM yet');
      return;
    }

    const track = this.currentTrack();
    if (!track?.video_url) {
      console.log('❌ No video URL found for current track');
      return;
    }

    const playerDiv = this.youtubePlayer.nativeElement;
    const videoId = this.musicService.getYouTubeId(track.video_url);
    
    if (!videoId) {
      console.log('❌ Could not extract video ID from:', track.video_url);
      return;
    }
    
    if (!(window as any).YT?.Player) {
      console.log('❌ YouTube API not ready yet');
      return;
    }

    try {
      console.log('🎬 Creating YouTube player (NOT auto-playing)');
      
      // Create player WITHOUT autoplay
      this.currentPlayer = new (window as any).YT.Player(playerDiv, {
        videoId: videoId,
        playerVars: {
          autoplay: 0, // Key fix: don't autoplay
          controls: 0, // Hide YouTube controls
          rel: 0,
          modestbranding: 1
        },
        events: {
          'onReady': (event: any) => {
            console.log('🎯 YouTube player ready (but not playing)');
            this.playbackCoordinator.setYouTubePlayer(this.currentPlayer);
            this.playbackCoordinator.onPlayerReady(event);
            // DON'T start playing here
          },
          'onStateChange': (event: any) => {
            console.log('� Player state changed:', event.data);
            this.playbackCoordinator.onPlayerStateChange(event);
          }
        }
      });
    } catch (error) {
      console.log('⚠️ Could not create YouTube player:', error);
    }
  }

  private destroyCurrentPlayer(): void {
    if (this.currentPlayer) {
      try {
        console.log('🗑️ Destroying current YouTube player');
        
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
        console.log('⚠️ Error destroying player:', error);
      } finally {
        this.currentPlayer = null;
      }
    }
  }

  //-----Event Handlers-----//
  onThumbnailClick(): void {
    // This should trigger play, not just toggle
    if (this.hasVideoUrl() && !this.isPlaying()) {
      console.log('🎯 Thumbnail clicked - starting playback');
      this.playbackCoordinator.togglePlayPause(); // This will start playing
    }
  }

  ngOnDestroy() {
    console.log('🗑️ Component destroying - cleaning up player');
    this.destroyCurrentPlayer();
  }
}

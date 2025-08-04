import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, effect } from '@angular/core';
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
export class RightPanelComponent implements AfterViewInit {
  @ViewChild('youtubeIframe', { static: false }) youtubeIframe!: ElementRef<HTMLIFrameElement>;
  
  //-----Injections-----//
  musicService = inject(MusicPlayerService);
  playbackCoordinator = inject(PlaybackCoordinatorService);

  //-----Computed Properties-----//
  readonly currentTrack = computed<Song | null>(() => this.musicService.currentTrack());
  readonly isPlaying = computed(() => this.musicService.isPlaying());
  readonly hasVideoUrl = computed(() => !!this.currentTrack()?.video_url);
  readonly showVideo = computed(() => this.hasVideoUrl() && this.isPlaying());
  readonly showThumbnail = computed(() => this.currentTrack() && !this.showVideo());

  readonly thumbnailUrl = computed(() => {
    const track = this.currentTrack();
    return track?.thumbnail_url || 'assets/images/thumbnail.png';
  });

  readonly videoEmbedUrl = computed(() => {
    const track = this.currentTrack();
    if (!track?.video_url) return null;
    return this.musicService.getVideoEmbedUrl(track.video_url);
  });

  constructor() {
    // Watch for video changes and connect to YouTube player
    effect(() => {
      const track = this.currentTrack();
      const isPlaying = this.isPlaying();
      
      if (track?.video_url && isPlaying) {
        // Give the iframe time to load, then connect to it
        setTimeout(() => this.connectToYouTubePlayer(), 1000);
      }
    });
  }

  ngAfterViewInit() {
    // Initial connection attempt
    setTimeout(() => this.connectToYouTubePlayer(), 1000);
  }

  private connectToYouTubePlayer(): void {
    if (!this.youtubeIframe?.nativeElement) {
      console.log('🔍 No iframe element found yet');
      return;
    }

    const iframe = this.youtubeIframe.nativeElement;
    const track = this.currentTrack();
    
    if (!track?.video_url) {
      console.log('🔍 No video URL found');
      return;
    }

    console.log('🎬 Connecting to YouTube iframe player');
    
    // Extract video ID from current track
    const videoId = this.musicService.getYouTubeId(track.video_url);
    if (!videoId) {
      console.log('❌ Could not extract video ID');
      return;
    }

    // Create a YouTube Player instance that connects to the existing iframe
    if ((window as any).YT && (window as any).YT.Player) {
      try {
        const player = new (window as any).YT.Player(iframe, {
          events: {
            'onReady': (event: any) => {
              console.log('🎯 YouTube player connected!');
              this.playbackCoordinator.setYouTubePlayer(player);
              this.playbackCoordinator.onPlayerReady(event);
            },
            'onStateChange': (event: any) => {
              console.log('🎯 Player state changed');
              this.playbackCoordinator.onPlayerStateChange(event);
            }
          }
        });
      } catch (error) {
        console.log('⚠️ Could not connect to existing iframe:', error);
      }
    } else {
      console.log('⏳ YouTube API not ready yet');
    }
  }

  //-----Methods-----//
  onThumbnailClick(): void {
    if (this.hasVideoUrl()) {
      this.playbackCoordinator.togglePlayPause();
    }
  }
}

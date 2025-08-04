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
  //-----View References-----//
  @ViewChild('youtubeIframe', { static: false }) youtubeIframe!: ElementRef<HTMLIFrameElement>;
  
  //-----Dependency Injection-----//
  private readonly musicService = inject(MusicPlayerService);
  private readonly playbackCoordinator = inject(PlaybackCoordinatorService);

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

  //-----Constructor-----//
  constructor() {
    effect(() => {
      const track = this.currentTrack();
      const isPlaying = this.isPlaying();
      
      if (track?.video_url && isPlaying) {
        setTimeout(() => this.connectToYouTubePlayer(), 1000);
      }
    });
  }

  //-----Lifecycle Methods-----//
  ngAfterViewInit(): void {
    setTimeout(() => this.connectToYouTubePlayer(), 1000);
  }

  //-----YouTube Player Connection-----//
  private connectToYouTubePlayer(): void {
    if (!this.youtubeIframe?.nativeElement || !this.currentTrack()?.video_url) {
      return;
    }

    const iframe = this.youtubeIframe.nativeElement;
    const videoId = this.musicService.getYouTubeId(this.currentTrack()!.video_url!);
    
    if (!videoId || !(window as any).YT?.Player) {
      return;
    }

    try {
      const player = new (window as any).YT.Player(iframe, {
        events: {
          'onReady': (event: any) => {
            this.playbackCoordinator.setYouTubePlayer(player);
            this.playbackCoordinator.onPlayerReady(event);
          },
          'onStateChange': (event: any) => {
            this.playbackCoordinator.onPlayerStateChange(event);
          }
        }
      });
    } catch (error) {
      // Silently fail if connection unsuccessful
    }
  }

  //-----Event Handlers-----//
  onThumbnailClick(): void {
    if (this.hasVideoUrl()) {
      this.playbackCoordinator.togglePlayPause();
    }
  }
}

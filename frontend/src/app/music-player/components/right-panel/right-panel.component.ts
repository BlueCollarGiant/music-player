import { Component, inject, computed, ElementRef, ViewChild } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { Song } from '../../Models/song.model';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent {
  @ViewChild('youtubeIframe', { static: false }) youtubeIframe!: ElementRef<HTMLIFrameElement>;
  player: any;
  currentTime: number = 0;
  intervalId: any;
  duration: number = 0;
  
  //-----Injections-----//
  musicService = inject(MusicPlayerService);

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

  //-----Methods-----//
  onThumbnailClick(): void {
    if (this.hasVideoUrl()) {
      this.musicService.togglePlayPause();
    }
  }
  ngAfterViewInit() {
    // Wait for the YouTube API to be ready
    (window as any).onYouTubeIframeAPIReady = () => {
      this.initPlayer();
    };
    // If API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      this.initPlayer();
    }
  }
    initPlayer() {
    this.player = new (window as any).YT.Player(this.youtubeIframe.nativeElement, {
      events: {
        'onReady': this.onPlayerReady.bind(this),
        'onStateChange': this.onPlayerStateChange.bind(this)
      }
    });
    }
    onPlayerReady(event: any) {
      this.duration = event.target.getDuration();
    }
    onPlayerStateChange(event: any) {
    if (event.data === (window as any).YT.PlayerState.PLAYING) {
      this.startTrackingTime();
    } else {
      this.stopTrackingTime();
      }
    }
    startTrackingTime() {
    this.stopTrackingTime();
    this.intervalId = setInterval(() => {
      this.currentTime = this.player.getCurrentTime();
      // You can emit this value or update your UI here
    }, 500);
  }

  stopTrackingTime() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}


import { Component, inject, computed, ElementRef, ViewChild } from '@angular/core';
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
export class RightPanelComponent {
  @ViewChild('youtubeIframe', { static: false }) youtubeIframe!: ElementRef<HTMLIFrameElement>;
  player: any;
  
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

  //-----Methods-----//
  onThumbnailClick(): void {
    if (this.hasVideoUrl()) {
      this.playbackCoordinator.togglePlayPause();
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
    // Connect the player to the PlaybackCoordinator
    this.playbackCoordinator.setYouTubePlayer(this.player);
    this.playbackCoordinator.onPlayerReady(event);
  }

  onPlayerStateChange(event: any) {
    // Let the PlaybackCoordinator handle state changes and progress tracking
    this.playbackCoordinator.onPlayerStateChange(event);
  }
}

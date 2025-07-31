import { Component, inject, computed, ElementRef, ViewChild } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent {
  @ViewChild('youtubeIframe') youtubeIframe!: ElementRef<HTMLIFrameElement>;
  
  //-----Injections-----//
  musicService = inject(MusicPlayerService);

  //-----Computed Properties-----//
  readonly currentTrack = computed(() => this.musicService.currentTrack());
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
}

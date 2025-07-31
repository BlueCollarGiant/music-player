import { Component, inject, computed, ElementRef, ViewChild, OnDestroy, effect } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent implements OnDestroy {
  @ViewChild('youtubeIframe') youtubeIframe!: ElementRef<HTMLIFrameElement>;
  
  musicService = inject(MusicPlayerService);
  private sanitizer = inject(DomSanitizer);
  
  private progressInterval: any = null;

  // Computed properties for reactive UI
  readonly currentTrack = computed(() => this.musicService.currentTrack());
  readonly isPlaying = computed(() => this.musicService.isPlaying());
  readonly hasVideoUrl = computed(() => !!this.currentTrack()?.video_url);
  readonly showVideo = computed(() => this.hasVideoUrl() && this.isPlaying());
  readonly showThumbnail = computed(() => this.currentTrack() && !this.showVideo());

  constructor() {
    // Effect to start/stop progress tracking when playing state changes
    effect(() => {
      if (this.isPlaying() && this.currentTrack()) {
        this.startSimpleProgressTracking();
      } else {
        this.stopProgressTracking();
      }
    });
  }

  // Get thumbnail URL or fallback
  readonly thumbnailUrl = computed(() => {
    const track = this.currentTrack();
    return track?.thumbnail_url || 'assets/images/thumbnail.png';
  });

  // Get safe YouTube embed URL
  readonly videoEmbedUrl = computed(() => {
    const track = this.currentTrack();
    if (!track?.video_url) return null;
    
    const videoId = this.getYouTubeId(track.video_url);
    if (!videoId) return null;
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&autoplay=1&controls=1&modestbranding=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  });

  ngOnDestroy() {
    this.stopProgressTracking();
  }

  // Handle thumbnail click - start video playback
  onThumbnailClick() {
    if (this.hasVideoUrl()) {
      this.musicService.togglePlayPause();
    }
  }

  // Extract YouTube video ID from URL
  private getYouTubeId(url: string): string | null {
    if (!url) return null;
    const idMatch = url.match(/v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
    return idMatch ? idMatch[1] : null;
  }

  // Simple progress tracking based on duration
  private startSimpleProgressTracking() {
    this.stopProgressTracking();
    
    const track = this.currentTrack();
    if (!track?.duration) return;
    
    const totalSeconds = this.getDurationInSeconds();
    if (totalSeconds <= 0) return;
    
    let elapsedSeconds = (this.musicService.currentProgress() / 100) * totalSeconds;
    
    this.progressInterval = setInterval(() => {
      if (this.isPlaying()) {
        elapsedSeconds += 1;
        const progress = Math.min((elapsedSeconds / totalSeconds) * 100, 100);
        
        this.musicService.currentProgress.set(progress);
        this.musicService.updateCurrentTime(elapsedSeconds);
        
        // Auto-advance to next song when finished
        if (progress >= 100) {
          this.stopProgressTracking();
          this.musicService.nextSong();
        }
      }
    }, 1000);
  }

  private getDurationInSeconds(): number {
    const track = this.currentTrack();
    if (!track?.duration) return 0;
    
    const parts = track.duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}

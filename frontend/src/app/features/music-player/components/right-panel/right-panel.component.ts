import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaybackStateStore } from '../../../../core/playback/playback-state.store';
import { PlaybackCoordinatorService } from '../../services/playback-coordinator.service';
import { AdapterRegistryService } from '../../../../core/playback/adapter-registry.service';
import { YouTubeAdapter } from '../../adapters/youtube.adapter';
import { getYouTubeId } from '../../../../shared/utils/youtube.util';
import { Song } from '../../../../shared/models/song.model';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('youtubePlayer', { static: false }) youtubePlayer!: ElementRef<HTMLDivElement>;

  //==================================================
  // SECTION: Dependency Injection
  //==================================================
  readonly musicService = inject(PlaybackStateStore);
  readonly playbackCoordinator = inject(PlaybackCoordinatorService);
  private readonly adapterRegistry = inject(AdapterRegistryService);
  private readonly ytAdapter = this.adapterRegistry.get('youtube') as YouTubeAdapter;

  //==================================================
  // SECTION: Reactive State / Computed Derivations
  //==================================================
  readonly currentTrack = computed<Song | null>(() => this.musicService.currentTrack());
  readonly isPlaying = computed(() => this.musicService.isPlaying());
  readonly hasVideoUrl = computed(() => !!this.currentTrack()?.video_url);
  readonly showThumbnailOverlay = computed(() => this.hasVideoUrl() && !this.isPlaying());

  //==================================================
  // SECTION: Platform Display Helpers (Cross-platform UI)
  //==================================================
  showVideo(): boolean {
    const t = this.currentTrack();
    return !!t && !!t.video_url && (t.platform === 'youtube' || !t.platform);
  }
  showStaticThumbnail(): boolean {
    const t = this.currentTrack();
    return !!t && !t.video_url; // non-YouTube or YouTube without a video url
  }
  thumbnailUrl(): string {
    const t = this.currentTrack();
    return t?.thumbnailUrl || t?.thumbnail_url || 'assets/images/thumbnail.png';
  }

  //==================================================
  // SECTION: YouTube Player Lifecycle (YouTube-specific)
  //==================================================
  private currentPlayer: any = null;
  private previousTrackId: string | null = null;

  private createYouTubePlayer(): void {
    const track = this.currentTrack();
  const videoId = track?.video_url ? getYouTubeId(track.video_url) : null;
    if (!this.youtubePlayer?.nativeElement || !videoId || !(window as any).YT?.Player) return;

    this.currentPlayer = new (window as any).YT.Player(this.youtubePlayer.nativeElement, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          this.ytAdapter.setPlayer(this.currentPlayer);
          this.ytAdapter.onReady();
          this.forcePlayerResize();
        },
        onStateChange: (event: any) => {
          const YT = (window as any).YT;
            // TODO: implement next-track handling outside of state store.
            this.ytAdapter.onStateChange(event.data, YT, () => {/* auto-advance handled elsewhere */});
        }
      }
    });
  }

  private forcePlayerResize(): void {
    if (!this.currentPlayer || !this.youtubePlayer) return;
    const container = this.youtubePlayer.nativeElement;
    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = '';
      iframe.style.top = '';
      iframe.style.left = '';
    }
  }

  private destroyCurrentPlayer(): void {
    if (!this.currentPlayer) return;
    try {
  this.ytAdapter.teardown();
      if (typeof this.currentPlayer.stopVideo === 'function') this.currentPlayer.stopVideo();
      if (typeof this.currentPlayer.destroy === 'function') this.currentPlayer.destroy();
    } catch { /* silent */ } finally {
      this.currentPlayer = null;
    }
  }

  //==================================================
  // SECTION: Effects (Track Change Watching)
  //==================================================
  constructor() { this.setupTrackChangeEffect(); }

  private setupTrackChangeEffect(): void {
    effect(() => {
      const track = this.currentTrack();
      const trackId = track?.id || null;
      if (trackId === this.previousTrackId) return; // no change
      this.destroyCurrentPlayer();
      if (track?.video_url) setTimeout(() => this.createYouTubePlayer(), 500); // defer until ViewChild present
      this.previousTrackId = trackId;
    });
  }

  //==================================================
  // SECTION: Angular Lifecycle
  //==================================================
  ngAfterViewInit(): void {
    const track = this.currentTrack();
    if (track?.video_url) {
      this.previousTrackId = track.id;
      setTimeout(() => this.createYouTubePlayer(), 500);
    }
  }

  ngOnDestroy(): void { this.destroyCurrentPlayer(); }

  //==================================================
  // SECTION: Event Handlers (User Interaction)
  //==================================================
  onThumbnailClick(): void {
  if (this.hasVideoUrl() && !this.isPlaying()) this.playbackCoordinator.toggle();
  }
}

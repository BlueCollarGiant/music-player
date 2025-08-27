import {
  Component,
  inject,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Switched from ControlsFacade to PlaylistInstanceService (single UI surface)
import { PlaylistInstanceService } from '../../../../core/playback/playlist-instance';
import { AdapterRegistryService } from '../../../../core/playback/adapter-registry.service';
import { YouTubeAdapter } from '../../adapters/youtube.adapter';
import { getYouTubeId } from '../../../../shared/utils/youtube.util';
import { Song } from '../../../../shared/models/song.model';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent, CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css',
})
export class RightPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('youtubePlayer', { static: false })
  youtubePlayer!: ElementRef<HTMLDivElement>;

  // ── DI ─────────────────────────────────────────────────────────────────────
  // Single source of truth (instance service)
  readonly c = inject(PlaylistInstanceService); // public for template bindings
  private readonly registry = inject(AdapterRegistryService);
  private readonly ytAdapter = this.registry.get('youtube') as YouTubeAdapter | null;

  // ── Canonical model usage (no legacy fields) ───────────────────────────────
  readonly track = computed<Song | null>(() => this.c.track());
  readonly isPlaying = computed(() => this.c.isPlaying());

  // Is this a YouTube track (by platform)?
  readonly isYouTube = computed(() => this.track()?.platform === 'youtube');

  // Do we have a usable YouTube video id?
  readonly youTubeId = computed(() => {
    const t = this.track();
    if (!t || t.platform !== 'youtube') return null;
    // 1) Prefer explicit ID
  if (t.id && t.id.length === 11) return t.id;

  // 2) Try parsing from URL
  const parsedFromUri = getYouTubeId(t.uri);

  // 3) If the uri itself is already an 11-char id, accept it
  if (!parsedFromUri && t.uri && t.uri.length === 11) return t.uri;

  return parsedFromUri ?? null;
    // Accept either a raw 11-char id or a full URL in song.uri
    
    
  });

  // Show overlay thumbnail when we have a video but are not playing
  readonly showThumbnailOverlay = computed(
    () => !!this.youTubeId() && !this.isPlaying()
  );

  // Unified thumbnail accessor with a safe fallback
  thumbnailUrl(): string {
    return this.track()?.thumbnailUrl || 'assets/images/musiclogo.png';
  }

  // ── YouTube player lifecycle (component owns DOM; adapter owns control) ────
  private player: any = null;
  private lastTrackKey: string | null = null;

  constructor() {
    // Rebuild player when the track identity changes
    effect(() => {
      const t = this.track();
      const key = t ? `${t.platform}:${t.id}:${t.uri ?? ''}` : null;
      if (key === this.lastTrackKey) return;

      this.destroyYouTubePlayer();

      // Create player only for valid YouTube items
      if (this.isYouTube() && this.youTubeId()) {
        setTimeout(() => this.createYouTubePlayer(), 0);
      }

      this.lastTrackKey = key;
    });
  }

  ngAfterViewInit(): void {
    if (this.isYouTube() && this.youTubeId()) {
      setTimeout(() => this.createYouTubePlayer(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyYouTubePlayer();
  }

  private createYouTubePlayer(): void {
    if (!this.ytAdapter) return;
    const videoId = this.youTubeId();
    console.log('[yt-create-attempt]', { videoId, isYouTube: this.isYouTube?.(), hostReady: !!this.youtubePlayer });
    const host = typeof window !== 'undefined' ? (window as any) : undefined;
    const YT = host?.YT;
    if (!this.youtubePlayer?.nativeElement || !videoId || !YT?.Player) return;
    console.log('[yt-create-skip]', { reason: 'guard-failed', hasHost: !!this.youtubePlayer?.nativeElement, hasYT: !!YT?.Player });
    this.player = new YT.Player(this.youtubePlayer.nativeElement, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          try { this.c.attachYouTubePlayer(this.player); } catch {}
          this.ytAdapter!.onReady();
          this.forcePlayerResize();
        },
        onStateChange: (event: any) => {
          const YTRef = host?.YT;
          this.ytAdapter!.onStateChange(event.data, YTRef, () => this.c.next());
        },
      },
    });
  }

  private forcePlayerResize(): void {
    if (!this.player || !this.youtubePlayer) return;
    const iframe = this.youtubePlayer.nativeElement.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = '';
      iframe.style.top = '';
      iframe.style.left = '';
    }
  }

  private destroyYouTubePlayer(): void {
    if (!this.player) return;
    try {
      this.ytAdapter?.teardown?.();
      if (typeof this.player.stopVideo === 'function') this.player.stopVideo();
      if (typeof this.player.destroy === 'function') this.player.destroy();
    } catch {
      // noop
    } finally {
      this.player = null;
    }
  }

  // ── UI handlers ────────────────────────────────────────────────────────────
  onThumbnailClick(): void {
    if (this.youTubeId() && !this.isPlaying()) this.c.toggle();
  }
}
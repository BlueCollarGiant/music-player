import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { PlaylistPanelComponent } from '../music-player/components/playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../music-player/components/right-panel/right-panel.component';

import { AuthService } from '../../core/auth/auth.service';
import { PlatformStateService } from '../../core/platform-state/platform-state.service';
import { YouTubeService } from '../music-player/services/youtube.service';
import { SpotifyService } from '../music-player/services/spotify.service'; // keep only if this page handles both

@Component({
  selector: 'app-youtube',
  standalone: true,
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './youtube.component.html',
  styleUrls: ['./youtube.component.css'],
})
export class YoutubeComponent implements OnInit {
  // ── DI ────────────────────────────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly platformState = inject(PlatformStateService);
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService); // remove if this page should be YouTube-only

  // ── Cross‑platform flags (this page still supports both) ──────────────────
  platform: 'youtube' | 'spotify' | 'soundcloud' = 'youtube';
  isYouTube = true;

  ngOnInit(): void {
    this.resolvePlatformFromRoute();
    this.platformState.set(this.platform);
    this.isYouTube = this.platform === 'youtube';
    this.loadPlatformPlaylists();
  }

  // Derive platform from /platform/:name routes
  private resolvePlatformFromRoute(): void {
    const parentSeg = this.route.parent?.snapshot.url[0]?.path;
    if (parentSeg !== 'platform') return;
    const platSeg = this.route.snapshot.url[0]?.path?.toLowerCase();
    if (platSeg === 'spotify' || platSeg === 'soundcloud' || platSeg === 'youtube') {
      this.platform = platSeg;
    }
  }

  private loadPlatformPlaylists(): void {
    if (this.platform === 'youtube') {
      if (this.auth.isPlatformConnected('youtube')) {
        this.yt.loadPlaylists();
      }
      return;
    }

    if (this.platform === 'spotify') {
      if (this.auth.isPlatformConnected('spotify')) {
        this.sp.loadPlaylists?.();
      }
      return;
    }

    // soundcloud: future
  }
}
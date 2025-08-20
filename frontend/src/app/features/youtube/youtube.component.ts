import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PlaylistPanelComponent } from '../music-player/components/playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../music-player/components/right-panel/right-panel.component';
import { YouTubeService } from './youtube.service';
import { SpotifyService } from '../music-player/services/spotify.service';
import { AuthService } from '../../core/auth/auth.service';
import { PlatformStateService } from '../../core/platform-state/platform-state.service';

@Component({
  selector: 'app-youtube',
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './youtube.component.html',
  styleUrl: './youtube.component.css'
})
export class YoutubeComponent implements OnInit {
  //==================================================
  // SECTION: Dependency Injection
  //==================================================
  private readonly youtubeService = inject(YouTubeService);
  private readonly spotifyService = inject(SpotifyService);
  private readonly authService = inject(AuthService);
  private readonly platformState = inject(PlatformStateService);
  private readonly route = inject(ActivatedRoute);

  //==================================================
  // SECTION: Cross-platform State
  //==================================================
  platform: 'youtube' | 'spotify' | 'soundcloud' = 'youtube';
  isYouTube = true; // convenience flag for template binding

  //==================================================
  // SECTION: Angular Lifecycle
  //==================================================
  ngOnInit(): void {
    this.resolvePlatformFromRoute();
    this.platformState.set(this.platform);
    this.isYouTube = this.platform === 'youtube';
    this.loadPlatformPlaylists();
  }

  //==================================================
  // SECTION: Route-derived Platform Resolution (Shared)
  //==================================================
  private resolvePlatformFromRoute(): void {
    // Parent route expected form: /platform/<name>
    const parentSeg = this.route.parent?.snapshot.url[0]?.path;
    if (parentSeg !== 'platform') return;
    const platSeg = this.route.snapshot.url[0]?.path?.toLowerCase();
    if (platSeg === 'spotify' || platSeg === 'soundcloud') {
      this.platform = platSeg;
    }
  }

  //==================================================
  // SECTION: Platform-specific Playlist Loading
  //==================================================
  private loadPlatformPlaylists(): void {
    if (this.platform === 'youtube') {
      if (this.authService.isPlatformConnected('youtube')) {
        this.youtubeService.loadPlaylists();
      }
      return;
    }
    if (this.platform === 'spotify') {
      if (this.authService.isPlatformConnected('spotify')) {
        this.spotifyService.loadPlaylists();
      }
      return;
    }
    // soundcloud (future) – no-op for now
  }
}

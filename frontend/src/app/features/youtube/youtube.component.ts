import { Component, inject, OnInit } from '@angular/core';
import { PlaylistPanelComponent } from '../music-player/components/playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../music-player/components/right-panel/right-panel.component';
import { SharedModule } from '../../shared/shared.module';
import { YouTubeService } from './youtube.service';
import { AuthService } from '../../core/auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { PlatformStateService } from '../../core/platform-state/platform-state.service';
import { SpotifyService } from '../spotify/spotify.service';

@Component({
  selector: 'app-youtube',
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './youtube.component.html',
  styleUrl: './youtube.component.css'
})
export class YoutubeComponent implements OnInit {
  private youtubeService = inject(YouTubeService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private platformState = inject(PlatformStateService);
  private spotifyService = inject(SpotifyService);

  platform: 'youtube' | 'spotify' | 'soundcloud' = 'youtube';
  isYouTube = true;

  ngOnInit(): void {
    // Determine platform from parent route segment (under /platform/<name>)
    const parentSeg = this.route.parent?.snapshot.url[0]?.path;
    if (parentSeg === 'platform') {
      const platSeg = this.route.snapshot.url[0]?.path?.toLowerCase();
      if (platSeg === 'spotify' || platSeg === 'soundcloud') {
        this.platform = platSeg;
      }
    }
    this.isYouTube = this.platform === 'youtube';
    this.platformState.set(this.platform);

    if (this.isYouTube) {
      if (this.authService.isPlatformConnected('youtube')) {
        this.youtubeService.loadPlaylists();
      }
    } else if (this.platform === 'spotify') {
      if (this.authService.isPlatformConnected('spotify')) {
        this.spotifyService.loadPlaylists();
      }
    }
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { PlaylistPanelComponent } from '../main-body/song-list-panel/playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../main-body/nowplaying-panel/right-panel/right-panel.component';
import { SharedModule } from '../../../shared/shared.module';
import { YouTubeService } from '../../../services/youtube.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-youtube',
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './youtube.component.html',
  styleUrl: './youtube.component.css'
})
export class YoutubeComponent implements OnInit {
  private youtubeService = inject(YouTubeService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Auto-load playlists when component initializes
    if (this.authService.isPlatformConnected('youtube')) {
      this.youtubeService.loadPlaylists();
    }
  }
}

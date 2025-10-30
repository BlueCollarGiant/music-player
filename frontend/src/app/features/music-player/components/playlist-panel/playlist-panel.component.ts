import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlayListLogicService } from '../../services/play-list-logic.service';
import { YouTubeService } from '../../services/youtube.service';
import { SpotifyService } from '../../services/spotify.service';
import { Song } from '../../../../shared/models/song.model';
import { PlaylistInstanceService } from '../../../../core/playback/playlist-instance';
import { OmniplayService } from '../../services/omniplay.service';

// Import child components
import { PlaylistPanelHeaderComponent } from './playlist-panel-logic/playlist-panel-header/playlist-panel-header.component';
import { SongListComponent } from './playlist-panel-logic/song-list/song-list.component';
import { PlaylistOption, PlaylistChangeEvent } from './playlist-panel-logic/playlist-selector/playlist-selector.component';

@Component({
  selector: 'app-playlist-panel',
  standalone: true,
  imports: [
    CommonModule,
    PlaylistPanelHeaderComponent,
    SongListComponent
  ],
  templateUrl: './playlist-panel.component.html',
  styleUrls: [
    './styles/design-system.css',
    './styles/playlist-panel.css',
    './styles/global-utils.css',

  ],
})
export class PlaylistPanelComponent {
  // ---- Inputs -------------------------------------------------------------------
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' = 'youtube';


  // ---- DI -----------------------------------------------------------------------
  private readonly playlistLogic = inject(PlayListLogicService);
  readonly youtubeService = inject(YouTubeService);
  readonly spotifyService = inject(SpotifyService);
  readonly c = inject(PlaylistInstanceService);
  private readonly omniplay = inject(OmniplayService);

  // ---- State helpers for template (following SRP - parent manages state) --------
  isEmpty(): boolean { return this.playlistLogic.isEmpty(); }
  isSmall(): boolean { return this.playlistLogic.isSmall(); }
  isMedium(): boolean { return this.playlistLogic.isMedium(); }
  isLarge(): boolean { return this.playlistLogic.isLarge(); }
  realSongCount(): number { return this.playlistLogic.realSongCount(); }

  // ---- Data providers for child components (following DIP) ----------------------
  getDisplaySongs(): Song[] {
    // Always use omniplay.mergedSongs() for consistent shuffle/order behavior across all modes
    return this.omniplay.mergedSongs();
  }

  getCurrentTrackId(): string | undefined {
    return this.c.track()?.id;
  }

  getYoutubePlaylists(): PlaylistOption[] {
    return this.youtubeService.playlists() as PlaylistOption[];
  }

  getSpotifyPlaylists(): PlaylistOption[] {
    return this.spotifyService.playlists() as PlaylistOption[];
  }

  // ---- Event handlers from child components (following OCP) ---------------------
  onShuffleTriggered(): void {
    // Works for all platforms now (single or multi)
    this.omniplay.forceReshuffle();
  }

  onSongSelected(song: Song): void {
    console.log('[Instance] selectSong()', { id: song?.id, platform: song?.platform, name: song?.name });
    const songs = this.getDisplaySongs();
    this.c.syncPlaylist(songs, song.id);
    this.c.selectTrack(song);
    this.c.setPlatform(song.platform as any);
  }

  onPlaylistChanged(event: PlaylistChangeEvent): void {
    const { platform, playlistId } = event;

    if (platform === 'youtube') {
      const pl = this.youtubeService.playlists().find(p => p.id === playlistId);
      if (pl) {
        this.youtubeService.selectPlaylist(pl);
        this.omniplay.recomputeAndSync();
      }
      return;
    }

    if (platform === 'spotify') {
      const pl = this.spotifyService.playlists().find((p: any) => p.id === playlistId);
      if ((this.spotifyService as any).selectPlaylist && pl) {
        (this.spotifyService as any).selectPlaylist(pl);
        this.omniplay.recomputeAndSync();
      }
      return;
    }
  }
}
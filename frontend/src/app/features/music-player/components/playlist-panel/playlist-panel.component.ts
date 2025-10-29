import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlayListLogicService } from '../../services/play-list-logic.service';
import { YouTubeService } from '../../services/youtube.service';
import { SpotifyService } from '../../services/spotify.service';
import { Song } from '../../../../shared/models/song.model';
import { PlaylistInstanceService } from '../../../../core/playback/playlist-instance';
import { OmniplayService } from '../../services/omniplay.service';

@Component({
  selector: 'app-playlist-panel',
  standalone: true,
  imports: [CommonModule],
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
  // ---- State helpers the template can call ----------------------------------
  isEmpty(): boolean  { return this.playlistLogic.isEmpty(); }
  isSmall(): boolean  { return this.playlistLogic.isSmall(); }
  isMedium(): boolean { return this.playlistLogic.isMedium(); }
  isLarge(): boolean  { return this.playlistLogic.isLarge(); }
  realSongCount(): number { return this.playlistLogic.realSongCount(); }

  // Map current platform items into displayable Song[] (always uses omniplay for unified behavior)
  getDisplaySongs(): Song[] {
    // Always use omniplay.mergedSongs() for consistent shuffle/order behavior across all modes
    return this.omniplay.mergedSongs();
  }

  triggerReshuffle(): void {
    // Works for all platforms now (single or multi)
    this.omniplay.forceReshuffle();
  }

  selectSong(song: Song): void {
    console.log('[Instance] selectSong()', { id: song?.id, platform: song?.platform, name: song?.name });
    const songs = this.getDisplaySongs();
    this.c.syncPlaylist(songs, song.id);
    this.c.selectTrack(song);
    this.c.setPlatform(song.platform as any);
  }

  // Playlist dropdown change - always syncs through omniplay for unified behavior
  onPlaylistChange(evt: Event, explicitPlatform?: 'youtube' | 'spotify'): void {
    const id = (evt.target as HTMLSelectElement).value;
    if (!id) return;

    const targetPlatform = explicitPlatform || this.platform;

    if (targetPlatform === 'youtube') {
      const pl = this.youtubeService.playlists().find(p => p.id === id);
      if (pl) {
        this.youtubeService.selectPlaylist(pl);
        // Always sync through omniplay (works for single or multi-platform)
        this.omniplay.recomputeAndSync();
      }
      return;
    }

    if (targetPlatform === 'spotify') {
      const pl = this.spotifyService.playlists().find((p: any) => p.id === id);
      if ((this.spotifyService as any).selectPlaylist && pl) {
        (this.spotifyService as any).selectPlaylist(pl);
        // Always sync through omniplay (works for single or multi-platform)
        this.omniplay.recomputeAndSync();
      }
      return;
    }
  }
}
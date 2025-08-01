import { Component, inject, computed, Input, OnInit } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { PlayListLogic } from '../../../services/play-list-logic.service';
import { YouTubeService } from '../../../services/youtube.service';
import { SharedModule } from '../../../shared/shared.module';
import { Song } from '../../Models/song.model';

@Component({
  selector: 'app-playlist-panel',
  imports: [SharedModule],
  templateUrl: './playlist-panel.component.html',
  styleUrls: [
    './styles/design-system.css',
    './styles/global-utils.css',
    './styles/song-list-container.css',
    './styles/song-item.css',
    './styles/playlist-dropdown.css',
    './styles/music-animations.css',
    './styles/mobile-responsive.css'
  ]
})
export class PlaylistPanelComponent implements OnInit {
  @Input() isYouTubeMode: boolean = false;
  
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic);
  public youtubeService = inject(YouTubeService);

  // Computed signals for responsive playlist behavior
  readonly realSongCount = computed<number>(() => {
    if (this.isYouTubeMode) {
      return this.youtubeService.playlistTracks().length;
    }
    return this.playlistLogic.realSongCount();
  });
  
  readonly isEmpty = computed<boolean>(() => {
    if (this.isYouTubeMode) {
      return this.realSongCount() === 0;
    }
    return this.playlistLogic.isEmpty();
  });
  
  readonly isSmall = computed<boolean>(() => {
    if (this.isYouTubeMode) {
      return this.realSongCount() > 0 && this.realSongCount() <= 3;
    }
    return this.playlistLogic.isSmall();
  });
  
  readonly isMedium = computed<boolean>(() => {
    if (this.isYouTubeMode) {
      return this.realSongCount() > 3 && this.realSongCount() <= 8;
    }
    return this.playlistLogic.isMedium();
  });
  
  readonly isLarge = computed<boolean>(() => {
    if (this.isYouTubeMode) {
      return this.realSongCount() > 8;
    }
    return this.playlistLogic.isLarge();
  });

  ngOnInit(): void {
    if (this.isYouTubeMode) {
      this.youtubeService.loadPlaylists();
    }
  }

  selectSong(song: Song) {
    this.musicService.selectTrack(song);
  }

  onPlaylistChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    
    if (this.isYouTubeMode) {
      const selectedPlaylist = this.youtubeService.playlists().find((p: any) => p.id === selectedValue);
      if (selectedPlaylist) {
        this.youtubeService.selectPlaylist(selectedPlaylist);
      }
    }
  }

  getDisplaySongs(): Song[] {
    if (this.isYouTubeMode) {
      return this.youtubeService.convertTracksToSongs();
    }
    return this.playlistLogic.displaySongList();
  }
}

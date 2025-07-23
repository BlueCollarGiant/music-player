import { Component, inject, computed, Input, OnInit, effect } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { PlayListLogic } from '../../../../../services/play-list-logic.service';
import { YouTubeService, YouTubePlaylist } from '../../../../../services/youtube.service';
import { SharedModule } from '../../../../../shared/shared.module';
import { Song } from '../../../../Models/song.model';

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
  readonly realSongCount = computed(() => {
    if (this.isYouTubeMode) {
      return this.youtubeService.playlistTracks().length;
    }
    return this.playlistLogic.displaySongList().filter(song => !song.isPlaceholder).length;
  });
  
  readonly isEmpty = computed(() => this.realSongCount() === 0);
  readonly isSmall = computed(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  readonly isMedium = computed(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  readonly isLarge = computed(() => this.realSongCount() > 8);

  ngOnInit(): void {
    if (this.isYouTubeMode) {
      this.youtubeService.loadPlaylists();
    }
  }

  selectSong(song: Song) {
    // Only allow selection of real songs, not placeholders
    if (!song.isPlaceholder) {
      this.musicService.currentTrack.set(song);
      // Reset progress when changing songs
      this.musicService.currentProgress.set(0);
      // Stop current playback
      this.musicService.isPlaying.set(false);
    }
  }

  onPlaylistChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    
    if (this.isYouTubeMode) {
      // Handle YouTube playlist selection
      const selectedPlaylist = this.youtubeService.playlists().find(p => p.id === selectedValue);
      if (selectedPlaylist) {
        this.youtubeService.selectPlaylist(selectedPlaylist);
      }
    } else {
      // Handle regular playlist selection
      console.log('Selected playlist:', selectedValue);
      // TODO: Implement regular playlist switching logic
    }
  }

  // Convert YouTube tracks to Song format for display
  getDisplaySongs(): Song[] {
    if (this.isYouTubeMode) {
      return this.youtubeService.playlistTracks().map((track, index) => ({
        id: index + 1,
        name: track.title,
        artist: track.artist,
        duration: track.duration,
        isPlaceholder: false
      }));
    }
    return this.playlistLogic.displaySongList();
  }
}

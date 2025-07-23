import { Component, inject, computed } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { PlayListLogic } from '../../../../../services/play-list-logic.service';
import { SongFormComponent } from './song-form/song-form.component';
import { SharedModule } from '../../../../../shared/shared.module';
import { Song } from '../../../../Models/song.model';

@Component({
  selector: 'app-playlist-panel',
  imports: [SharedModule, SongFormComponent],
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
export class PlaylistPanelComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)

  // Computed signals for responsive playlist behavior
  readonly realSongCount = computed(() => 
    this.playlistLogic.displaySongList().filter(song => !song.isPlaceholder).length
  );
  
  readonly isEmpty = computed(() => this.realSongCount() === 0);
  readonly isSmall = computed(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  readonly isMedium = computed(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  readonly isLarge = computed(() => this.realSongCount() > 8);

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

  removeSong(event: Event, songId: number) {
    // Prevent the click from bubbling up to the item click
    event.stopPropagation();
    this.playlistLogic.removeSong(songId);
  }

  onPlaylistChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedPlaylist = target.value;
    
    // TODO: Implement playlist switching logic
    console.log('Selected playlist:', selectedPlaylist);
    
    // This is where we'll integrate with the OAuth playlist fetching
    // For now, just log the selection
  }
}

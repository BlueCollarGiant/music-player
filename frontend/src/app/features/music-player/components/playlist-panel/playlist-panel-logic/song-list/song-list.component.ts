import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song } from '../../../../../../shared/models/song.model';
import { SongItemComponent } from '../song-item/song-item.component';
import type { PlaylistRecord } from '../../../../../../features/local/services/local-playlists.service';

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [CommonModule, SongItemComponent],
  templateUrl: './song-list.component.html',
  styleUrl: './song-list.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class SongListComponent {
  // Inputs - following ISP (only what this component needs)
  @Input() songs: Song[] = [];
  @Input() currentTrackId: string | undefined;
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local' = 'youtube';
  @Input() songCount: number = 0;
  /** Passed through to song-item for local platform quick-add dropdown. */
  @Input() localPlaylists: PlaylistRecord[] = [];

  // Output - following DIP (depend on abstraction, not implementation)
  @Output() songSelected = new EventEmitter<Song>();
  @Output() songRemoved = new EventEmitter<Song>();
  @Output() addToPlaylist = new EventEmitter<{ song: Song; playlistId: string }>();

  // Event delegation - pure passthrough (SRP: list management only)
  onSongClicked(song: Song): void {
    this.songSelected.emit(song);
  }

  onSongRemoved(song: Song): void {
    this.songRemoved.emit(song);
  }

  onAddToPlaylist(event: { song: Song; playlistId: string }): void {
    this.addToPlaylist.emit(event);
  }

  // Helper method to determine if a song is active
  isActive(song: Song): boolean {
    return song.id === this.currentTrackId;
  }
}

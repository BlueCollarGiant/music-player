import { Component, Input, Output, EventEmitter, ViewEncapsulation, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song } from '../../../../../../shared/models/song.model';
import type { PlaylistRecord } from '../../../../../../features/local/services/local-playlists.service';

@Component({
  selector: 'app-song-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-item.component.html',
  styleUrl: './song-item.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class SongItemComponent implements OnDestroy {
  // Inputs - following ISP (only what this component needs)
  @Input() song!: Song;
  @Input() isActive: boolean = false;
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local' = 'youtube';
  /** Local playlists for the quick-add dropdown (local platform only). */
  @Input() localPlaylists: PlaylistRecord[] = [];

  // Output - following DIP (depend on abstraction, not implementation)
  @Output() songClicked = new EventEmitter<Song>();
  @Output() removeClicked = new EventEmitter<Song>();
  @Output() addToPlaylist = new EventEmitter<{ song: Song; playlistId: string }>();

  /** Transient "just added" flag — drives checkmark animation for ~900ms. */
  readonly justAdded = signal(false);
  private _justAddedTimer: ReturnType<typeof setTimeout> | null = null;

  // Handle click - pure event delegation (SRP: presentation only)
  onSongClick(): void {
    this.songClicked.emit(this.song);
  }

  onRemoveClick(event: MouseEvent): void {
    event.stopPropagation(); // prevent triggering songClicked on the parent row
    this.removeClicked.emit(this.song);
  }

  onAddToPlaylist(event: Event): void {
    event.stopPropagation();
    const select = event.target as HTMLSelectElement;
    const playlistId = select.value;
    if (!playlistId) return;
    this.addToPlaylist.emit({ song: this.song, playlistId });
    select.value = '';
    // Show checkmark for 900ms then fade (animation handles the fade)
    if (this._justAddedTimer) clearTimeout(this._justAddedTimer);
    this.justAdded.set(true);
    this._justAddedTimer = setTimeout(() => {
      this.justAdded.set(false);
      this._justAddedTimer = null;
    }, 900);
  }

  ngOnDestroy(): void {
    if (this._justAddedTimer) clearTimeout(this._justAddedTimer);
  }

  // Helper method for determining which icon to show
  shouldShowYouTubeIcon(): boolean {
    if (this.platform === 'omniplay') {
      return this.song.platform === 'youtube' && !this.isActive;
    }
    return this.platform === 'youtube' && !this.isActive;
  }

  shouldShowSpotifyIcon(): boolean {
    if (this.platform === 'omniplay') {
      return this.song.platform === 'spotify' && !this.isActive;
    }
    return this.platform === 'spotify' && !this.isActive;
  }
}

import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song } from '../../../../../../shared/models/song.model';

@Component({
  selector: 'app-song-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-item.component.html',
  styleUrl: './song-item.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class SongItemComponent {
  // Inputs - following ISP (only what this component needs)
  @Input() song!: Song;
  @Input() isActive: boolean = false;
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local' = 'youtube';

  // Output - following DIP (depend on abstraction, not implementation)
  @Output() songClicked = new EventEmitter<Song>();

  // Handle click - pure event delegation (SRP: presentation only)
  onSongClick(): void {
    this.songClicked.emit(this.song);
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

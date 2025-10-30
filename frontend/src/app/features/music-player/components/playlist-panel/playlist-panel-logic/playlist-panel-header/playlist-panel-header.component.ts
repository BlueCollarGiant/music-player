import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaylistSelectorComponent, PlaylistOption, PlaylistChangeEvent } from '../playlist-selector/playlist-selector.component';

@Component({
  selector: 'app-playlist-panel-header',
  standalone: true,
  imports: [CommonModule, PlaylistSelectorComponent],
  templateUrl: './playlist-panel-header.component.html',
  styleUrl: './playlist-panel-header.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class PlaylistPanelHeaderComponent {
  // Inputs - following ISP (only what this component needs)
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' = 'youtube';
  @Input() youtubePlaylists: PlaylistOption[] = [];
  @Input() spotifyPlaylists: PlaylistOption[] = [];
  @Input() youtubeLoading: boolean = false;
  @Input() spotifyLoading: boolean = false;

  // Outputs - following DIP (depend on abstraction, not implementation)
  @Output() playlistChanged = new EventEmitter<PlaylistChangeEvent>();
  @Output() shuffleTriggered = new EventEmitter<void>();

  // Event delegation - pure passthrough (SRP: composition only)
  onPlaylistChanged(event: PlaylistChangeEvent): void {
    this.playlistChanged.emit(event);
  }

  onShuffleClick(): void {
    this.shuffleTriggered.emit();
  }
}

import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlaylistOption {
  id: string;
  title: string;
  video_count?: number;
}

export interface PlaylistChangeEvent {
  platform: 'youtube' | 'spotify';
  playlistId: string;
}

@Component({
  selector: 'app-playlist-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playlist-selector.component.html',
  styleUrl: './playlist-selector.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class PlaylistSelectorComponent {
  // Inputs - following ISP (only what this component needs)
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local' = 'youtube';
  @Input() youtubePlaylists: PlaylistOption[] = [];
  @Input() spotifyPlaylists: PlaylistOption[] = [];
  @Input() youtubeLoading: boolean = false;
  @Input() spotifyLoading: boolean = false;

  // Output - following DIP (depend on abstraction, not implementation)
  @Output() playlistChanged = new EventEmitter<PlaylistChangeEvent>();

  // Handle playlist change - pure event delegation
  onPlaylistChange(event: Event, explicitPlatform?: 'youtube' | 'spotify'): void {
    const playlistId = (event.target as HTMLSelectElement).value;
    if (!playlistId) return;

    const targetPlatform = explicitPlatform || this.platform;

    this.playlistChanged.emit({
      platform: targetPlatform as 'youtube' | 'spotify',
      playlistId
    });
  }
}

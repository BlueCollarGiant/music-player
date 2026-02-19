import { Component, Input, Output, EventEmitter, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlaylistSelectorComponent, PlaylistOption, PlaylistChangeEvent } from '../playlist-selector/playlist-selector.component';
import { PlaylistRecord, LIBRARY_VIEW } from '../../../../../local/services/local-playlists.service';

@Component({
  selector: 'app-playlist-panel-header',
  standalone: true,
  imports: [CommonModule, PlaylistSelectorComponent],
  templateUrl: './playlist-panel-header.component.html',
  styleUrl: './playlist-panel-header.component.css',
  encapsulation: ViewEncapsulation.None // Inherit parent styles
})
export class PlaylistPanelHeaderComponent {
  private readonly router = inject(Router);

  // Inputs - following ISP (only what this component needs)
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local' = 'youtube';
  @Input() youtubePlaylists: PlaylistOption[] = [];
  @Input() spotifyPlaylists: PlaylistOption[] = [];
  @Input() youtubeLoading: boolean = false;
  @Input() spotifyLoading: boolean = false;
  @Input() localPlaylists: PlaylistRecord[] = [];
  @Input() activeLocalPlaylistId: string = LIBRARY_VIEW;

  // Outputs - following DIP (depend on abstraction, not implementation)
  @Output() playlistChanged = new EventEmitter<PlaylistChangeEvent>();
  @Output() shuffleTriggered = new EventEmitter<void>();
  @Output() importTriggered = new EventEmitter<FileList>();
  @Output() localPlaylistChanged = new EventEmitter<string>();

  readonly LIBRARY_VIEW = LIBRARY_VIEW;

  get activeLocalPlaylistName(): string {
    if (this.activeLocalPlaylistId === LIBRARY_VIEW) return 'Library';
    const pl = this.localPlaylists.find(p => p.id === this.activeLocalPlaylistId);
    return pl?.name ?? 'Library';
  }

  get activeQueueLabel(): string {
    return `Queue: ${this.activeLocalPlaylistName}`;
  }

  // Event delegation - pure passthrough (SRP: composition only)
  onPlaylistChanged(event: PlaylistChangeEvent): void {
    this.playlistChanged.emit(event);
  }

  onShuffleClick(): void {
    this.shuffleTriggered.emit();
  }

  onImportChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      this.importTriggered.emit(files);
      // Reset input so the same files can be re-imported if needed
      (event.target as HTMLInputElement).value = '';
    }
  }

  navigateToLibrary(): void {
    this.router.navigate(['/platform/local/library']);
  }

  onLocalPlaylistChange(event: Event): void {
    this.localPlaylistChanged.emit((event.target as HTMLSelectElement).value);
  }
}

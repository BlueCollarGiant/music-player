import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../../../shared/models/song.model';

const LOCAL_STORAGE_KEY = 'music-player-playlist';

@Injectable({ providedIn: 'root' })
export class PlayListLogic {
  //-----Private State-----//
  private songList = signal<Song[]>(
    this.loadFromLocalStorage() || []
  );

  //-----Private Methods-----//
  private loadFromLocalStorage(): Song[] | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as Song[];
      } catch {
        // Failed to parse localStorage, return null to use default
        return null;
      }
    }
    return null;
  }

  //-----Display Logic-----//

  // Display songs without placeholders - users can only view their playlists
  readonly displaySongList = computed(() => {
    return this.songList();
  });

  // Playlist size calculations
  readonly realSongCount = computed(() => {
    return this.displaySongList().filter(song => !song.isPlaceholder).length;
  });

  readonly isEmpty = computed(() => this.realSongCount() === 0);
  readonly isSmall = computed(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  readonly isMedium = computed(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  readonly isLarge = computed(() => this.realSongCount() > 8);
}

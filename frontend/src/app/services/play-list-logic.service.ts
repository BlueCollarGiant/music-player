import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { Song } from '../music-player/Models/song.model';
import { MusicPlayerService } from './music-player.service';

const LOCAL_STORAGE_KEY = 'music-player-playlist'; // local storage
@Injectable({ providedIn: 'root' })
export class PlayListLogic {
  //------injections area-----//

  private injector = inject(Injector);
  private get musicService(): MusicPlayerService {
    return this.injector.get(MusicPlayerService);
  }
  // inject Song from musicService commenting because i keep losing song lol
  private songList = signal<Song[]>(
    this.loadFromLocalStorage() || []
  );

  //-----Local storage setup area---//

  

  // local storage Load on startup
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

  //-----Display Logic -----//

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

  //-----Methods go here stop leaving them everywhere -----//

  // Note: Song management is now handled through playlist selection only
  // Users cannot manually add/remove individual songs
}

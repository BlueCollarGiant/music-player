import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { songQue } from '../data/music-data';
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
    this.loadFromLocalStorage() || [...songQue]
  );

  //-----Local storage setup area---//

  //  Save only real songs
  private saveToLocalStorage(songs: Song[]): void {
    if (typeof window === 'undefined') return;
    const realSongs = songs.filter((song) => !song.isPlaceholder);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(realSongs));
  }

  // local storage Load on startup
  private loadFromLocalStorage(): Song[] | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as Song[];
      } catch (e) {
        console.error('❌ Failed to parse localStorage playlist:', e);
      }
    }
    return null;
  }

  //-----Display Logic -----//

  // Display songs without placeholders - users can only view their playlists
  readonly displaySongList = computed(() => {
    return this.songList();
  });

  //-----Methods go here stop leaving them everywhere -----//

  // Note: Song management is now handled through playlist selection only
  // Users cannot manually add/remove individual songs
}

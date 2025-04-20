import { computed, inject, Injectable, Injector, signal } from "@angular/core";
import { songQue } from "../data/music-data";
import { Song } from "../music-player/Models/song.model";
import { MusicPlayerService } from "./music-player.service";

const LOCAL_STORAGE_KEY = 'music-player-playlist'; // local storage
@Injectable({ providedIn: 'root' })
export class PlayListLogic {

  private injector = inject(Injector);
  private get musicService(): MusicPlayerService {
  return this.injector.get(MusicPlayerService);
}
  // ✅ Save only real songs
  private saveToLocalStorage(songs: Song[]): void {
    if (typeof window === 'undefined') return;
    const realSongs = songs.filter(song => !song.isPlaceholder);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(realSongs));
  }

    // ✅ Load on startup
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

  // inject Song from musicService
  private songList = signal<Song[]>(this.loadFromLocalStorage() || [...songQue]);


  //Placeholder Logic
  readonly displaySongList = computed(() => {
    const current = this.songList();
    const MIN_SONGS = 8;
    const placeholdersNeeded = MIN_SONGS - current.length;

    const placeholders = Array.from({ length: placeholdersNeeded > 0 ? placeholdersNeeded: 0}, (_, i) => ({
      id: 1000 + i,
    name: '+ Add a Song',
    artist:'',
    isPlaceholder: true,
    duration: '--:--'
    }));
    return [...current, ...placeholders];
  });


  // methods section

  addSong(song: Song){
    this.songList.update(current => {
      const index = current.findIndex(entry => entry.isPlaceholder);

      const updated = [...current]; //create copy of current song list so dont mess up original

      if (index !== -1) { // checks if found placeholder


        updated[index] = song; // take index placeholder was found replace with song we made

      } else {
        updated.push(song);
      }
      this.saveToLocalStorage(updated);

    return updated; //update signal obviously
    });
    // Auto-select if no real current track is active
    if (!this.musicService.currentTrack() || this.musicService.currentTrack()?.isPlaceholder) {
    this.musicService.currentTrack.set(song);
  }
  }
  removeSong(id: number): void {
    this.songList.update(current => {
      const update = current.filter(entry => entry.id !== id);
      this.saveToLocalStorage(update);
    return update;
  });
}


}

import { computed, inject, Injectable, Injector, signal } from "@angular/core";
import { songQue } from "../data/music-data";
import { Song } from "../music-player/Models/song.model";
import { MusicPlayerService } from "./music-player.service";


@Injectable({ providedIn: 'root' })
export class PlayListLogic {

  private injector = inject(Injector);
  private get musicService(): MusicPlayerService {
  return this.injector.get(MusicPlayerService);
}

  // inject Song from musicService
  private songList = signal<Song[]>([...songQue]);

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

    return updated; //update signal obviously
    });
    // Auto-select if no real current track is active
    if (!this.musicService.currentTrack() || this.musicService.currentTrack()?.isPlaceholder) {
    this.musicService.currentTrack.set(song);
  }
  }
  removeSong(id: number): void {
    this.songList.update(current => current.filter(entry => entry.id !== id));
  }
}

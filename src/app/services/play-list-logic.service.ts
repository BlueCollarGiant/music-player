import { computed, effect, Injectable, signal } from "@angular/core";
import { songQue } from "../data/music-data";
import { Song } from "../music-player/Models/song.model";


@Injectable({ providedIn: 'root' })
export class PlayListLogic {

  constructor() {
    effect(()=> {
      console.log('🎵 Updated Playlist:', this.songList())
    })
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
  }

  removeSong(id: number) {
    this.songList.update(current => current.filter(entry => entry.id !== id));
  }
}

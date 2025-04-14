import { computed, Injectable, signal } from "@angular/core";
import { songQue } from "../data/music-data";
import { Song } from "../music-player/Models/song.model";


@Injectable({ providedIn: 'root' })
export class PlayListLogic {
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
    isPlaceholder: true,
    duration: '--:--'
    }));
    return [...current, ...placeholders];
  });


  // methods section

  addSong(song: Song){
    this.songList.update(current => [... current, song]);
  }

  removeSong() {
    console.log("remove song")
  }
}

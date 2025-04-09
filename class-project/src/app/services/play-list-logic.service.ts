import { computed, Injectable, signal } from "@angular/core";
import { songQue } from "../data/music-data";
import { Song } from "../music-player/Models/song.model";


@Injectable({ providedIn: 'root' })
export class PlayListLogic {

  private songList = signal<Song[]>([...songQue]);

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
}

import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../../../shared/models/song.model';

//==================================================
// SECTION: Persistence Constants
//==================================================
const LOCAL_STORAGE_KEY = 'music-player-playlist';

@Injectable({ providedIn: 'root' })
export class PlayListLogic {
  //==================================================
  // SECTION: Reactive State
  //==================================================
  private songList = signal<Song[]>(this.loadFromLocalStorage() || []);

  //==================================================
  // SECTION: Persistence Helpers
  //==================================================
  private loadFromLocalStorage(): Song[] | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as Song[]; } catch { return null; }
  }
  // TODO: Add a saveToLocalStorage() when mutations are introduced.

  //==================================================
  // SECTION: Derived Lists / Display
  //==================================================
  readonly displaySongList = computed(() => this.songList());

  //==================================================
  // SECTION: Aggregate Metrics & Size Classification
  //==================================================
  readonly realSongCount = computed(() => this.displaySongList().filter(song => !song.isPlaceholder).length);

  readonly isEmpty  = computed(() => this.realSongCount() === 0);
  readonly isSmall  = computed(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  readonly isMedium = computed(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  readonly isLarge  = computed(() => this.realSongCount() > 8);
}

import { Injectable, signal, computed, inject } from '@angular/core';
import { Song } from '../music-player/Models/song.model';
import { songQue } from '../data/music-data';
import { PlayListLogic } from './play-list-logic.service';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
displaySongList() {
throw new Error('Method not implemented.');
}
  // Tabs for nav-bar
  activeTab = signal<string>('Songs');
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Playback needed by player-controls
  isPlaying = signal<boolean>(false);
  currentProgress = signal<number>(33.3);


  // Song Library Core data for main-body look in data folder for data
  private playlist = inject(PlayListLogic);



  // Current Track
  currentTrack = signal<Song | null>(this.songs[1] ?? null); // if this.songs[1] is undefined fall back to null

  // Audio Visualizer Bars
  audioBars = signal<number[]>(Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100))));


  // Methods

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  togglePlayPause(): void {
    this.isPlaying.set(!this.isPlaying());
    // Add real audio API logic here later
  }

  selectSong(song: Song): void {
    if (song.isHeader) return;
    this.currentTrack.set({
      ...song,
      duration: song.duration || '3:45'
    });
    // Load and optionally autoplay the song here
  }

  previousSong(): void {
    const songList = this.songs;
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let prevIndex = currentIndex - 1;

    // Skip header or wrap around
    if (prevIndex < 1) {
      prevIndex = songList.length - 1;
    }

    const prevSong = songList[prevIndex];
    if (prevSong) {
    this.selectSong(prevSong);
    } else {
      console.warn('No previous song found at index', prevIndex);
    }
  }

  //fix this it should mirror previous song
  nextSong(): void {
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let nextIndex = currentIndex + 1;

    // Skip header or wrap around
    if (nextIndex >= this.songs.length) {
      nextIndex = this.playlist.displaySongList().length + 1;
    }
    const nextSong =
    this.selectSong(this.songs[nextIndex]);
  }

  setVolume(level: number): void {
    // Optional: use this later for volume slider
  }

  seekTo(position: number): void {
    this.currentProgress.set(position);
    // Optional: implement actual audio seek here
  }
  get songs() {
    return this.playlist.displaySongList();
  }
}



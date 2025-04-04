import { Injectable, signal } from '@angular/core';
import { Song } from '../music-player/Models/song.model';


@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  // Tabs for nav-bar
  activeTab = signal<string>('Songs');
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Playback needed by player-controls
  isPlaying = signal<boolean>(false);
  currentProgress = signal<number>(33.3);


  // Song Library Core data for main-body
  songs = signal<Song[]>([
    { id: 1, name: 'Song List', isHeader: true },
    { id: 2, name: 'Blinding Lights', artist: 'The Weeknd', duration: '3:45' },
    { id: 3, name: 'Save Your Tears', artist: 'The Weeknd', duration: '3:36' },
    { id: 4, name: 'Levitating', artist: 'Dua Lipa', duration: '3:24' },
    { id: 5, name: 'Don\'t Start Now', artist: 'Dua Lipa', duration: '3:03' }
  ]);

  // Current Track
  currentTrack = signal<Song>(this.songs()[1]); // controls the currently selected track

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
    const currentIndex = this.songs().findIndex(s => s.name === this.currentTrack.name);
    let prevIndex = currentIndex - 1;

    // Skip header or wrap around
    if (prevIndex < 1) {
      prevIndex = this.songs.length - 1;
    }

    this.selectSong(this.songs()[prevIndex]);
  }

  nextSong(): void {
    const currentIndex = this.songs().findIndex(s => s.name === this.currentTrack.name);
    let nextIndex = currentIndex + 1;

    // Skip header or wrap around
    if (nextIndex >= this.songs.length) {
      nextIndex = 1;
    }

    this.selectSong(this.songs()[nextIndex]);
  }

  setVolume(level: number): void {
    // Optional: use this later for volume slider
  }

  seekTo(position: number): void {
    this.currentProgress.set(position);
    // Optional: implement actual audio seek here
  }
}



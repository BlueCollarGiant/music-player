import { Injectable } from '@angular/core';
import { Song } from '../music-player/Models/song.model';


@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  activeTab: string = 'Songs';
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  isPlaying: boolean = false;
  currentProgress: number = 33.3;

  songs: Song[] = [
    { id: 1, name: 'Song List', isHeader: true },
    { id: 2, name: 'Blinding Lights', artist: 'The Weeknd', duration: '3:45' },
    { id: 3, name: 'Save Your Tears', artist: 'The Weeknd', duration: '3:36' },
    { id: 4, name: 'Levitating', artist: 'Dua Lipa', duration: '3:24' },
    { id: 5, name: 'Don\'t Start Now', artist: 'Dua Lipa', duration: '3:03' }
  ];

  currentTrack: Song = this.songs[1];

  audioBars: number[] = Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)));

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
  }

  selectSong(song: Song): void {
    if (song.isHeader) return;
    this.currentTrack = {
      ...song,
      duration: song.duration || '3:45'
    };
  }

  previousSong(): void {
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 1) prevIndex = this.songs.length - 1;
    this.selectSong(this.songs[prevIndex]);
  }

  nextSong(): void {
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= this.songs.length) nextIndex = 1;
    this.selectSong(this.songs[nextIndex]);
  }
}

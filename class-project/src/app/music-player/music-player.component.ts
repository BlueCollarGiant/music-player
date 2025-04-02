import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavBarComponent } from './header/nav-bar/nav-bar.component';
import { MainBodyComponent } from './main/main-body/main-body.component';
import { PlayerControlsComponent } from './footer/player-controls/player-controls.component';

interface Song {
  id: number;
  name: string;
  artist?: string;
  duration?: string;
  isHeader?: boolean;
}

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [
    CommonModule,
    NavBarComponent,
    MainBodyComponent,
    PlayerControlsComponent
  ],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.css']
})
export class MusicPlayerComponent {
  // Tabs
  activeTab: string = 'Songs';
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Playback
  isPlaying: boolean = false;
  currentProgress: number = 33.3;

  // Song Library
  songs: Song[] = [
    { id: 1, name: 'Song List', isHeader: true },
    { id: 2, name: 'Blinding Lights', artist: 'The Weeknd', duration: '3:45' },
    { id: 3, name: 'Save Your Tears', artist: 'The Weeknd', duration: '3:36' },
    { id: 4, name: 'Levitating', artist: 'Dua Lipa', duration: '3:24' },
    { id: 5, name: 'Don\'t Start Now', artist: 'Dua Lipa', duration: '3:03' }
  ];

  // Current Track
  currentTrack: Song = this.songs[1]; // Start with the first actual song

  // Audio Visualizer Bars
  audioBars: number[] = Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)));

  // Methods

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    // Add real audio API logic here later
  }

  selectSong(song: Song): void {
    if (song.isHeader) return;
    this.currentTrack = {
      ...song,
      duration: song.duration || '3:45'
    };
    // Load and optionally autoplay the song here
  }

  previousSong(): void {
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let prevIndex = currentIndex - 1;

    // Skip header or wrap around
    if (prevIndex < 1) {
      prevIndex = this.songs.length - 1;
    }

    this.selectSong(this.songs[prevIndex]);
  }

  nextSong(): void {
    const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.name);
    let nextIndex = currentIndex + 1;

    // Skip header or wrap around
    if (nextIndex >= this.songs.length) {
      nextIndex = 1;
    }

    this.selectSong(this.songs[nextIndex]);
  }

  setVolume(level: number): void {
    // Optional: use this later for volume slider
  }

  seekTo(position: number): void {
    this.currentProgress = position;
    // Optional: implement actual audio seek here
  }
}

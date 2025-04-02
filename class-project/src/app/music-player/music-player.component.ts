
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Song {
  id: number;
  name: string;
  artist?: string;
  isHeader?: boolean;
}

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.css']
})
export class MusicPlayerComponent {
  // Player State
  isPlaying = false;
  currentProgress = 33.333; // Example progress (0-100)
  currentTime = '3:27'; // Example time display
  volume = 70;

  // Navigation
  activeTab = 'Songs';
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Music Data
  songs: Song[] = [
    { id: 1, name: 'Song List', isHeader: true },
    { id: 2, name: 'Blinding Lights', artist: 'The Weeknd' },
    { id: 3, name: 'Save Your Tears', artist: 'The Weeknd' },
    { id: 4, name: 'Levitating', artist: 'Dua Lipa' },
    { id: 5, name: 'Don\'t Start Now', artist: 'Dua Lipa' }
  ];

  // Visualizer
  audioBars = Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)));

  // Current Track
  currentTrack = {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:45'
  };

  // Navigation
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Playback Control
  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    // Add actual audio playback logic here
  }

  // Song Selection
  selectSong(song: Song): void {
    if (song.isHeader) return;
    this.currentTrack = {
      title: song.name,
      artist: song.artist || 'Unknown Artist',
      duration: '3:45' // Replace with actual duration
    };
    // Add logic to load and play the selected song
  }

  // Volume Control
  setVolume(level: number): void {
    this.volume = Math.max(0, Math.min(100, level));
    // Add actual volume control logic here
  }

  // Progress Control (for seek bar)
  seekTo(position: number): void {
    this.currentProgress = position;
    // Add actual seek logic here
  }
  // Add to your MusicPlayerComponent class
previousSong(): void {
  const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.title);
  const prevIndex = (currentIndex - 1 + this.songs.length) % this.songs.length;
  this.selectSong(this.songs[prevIndex]);
}

nextSong(): void {
  const currentIndex = this.songs.findIndex(s => s.name === this.currentTrack.title);
  const nextIndex = (currentIndex + 1) % this.songs.length;
  this.selectSong(this.songs[nextIndex]);
}
}

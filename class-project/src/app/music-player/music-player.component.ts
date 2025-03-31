import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Song {
  id: number;
  name: string;
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
  activeTab: string = 'Songs';
  isPlaying: boolean = true;

  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  songs: Song[] = [
    { id: 1, name: 'Song List', isHeader: true },
    { id: 2, name: 'Song Name 1' },
    { id: 3, name: 'Song Name 2' },
    { id: 4, name: 'Song Name 3' },
    { id: 5, name: 'Song Name 4' },
    { id: 6, name: 'Song Name 5' },
    { id: 7, name: 'Song Name 6' },
    { id: 8, name: 'Song Name 7' },
    { id: 9, name: 'Song Name 8' }
  ];

  visualizerBars: number[] = Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100)));

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
  }
}

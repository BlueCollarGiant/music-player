import { Injectable, signal, inject } from '@angular/core';
import { Song } from '../music-player/Models/song.model';
import { PlayListLogic } from './play-list-logic.service';
import { TimeService } from './time.service';

@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  readonly playbackStarted = signal(false);
  //inject time service
  private timeService = inject(TimeService);
  // Tabs for nav-bar
  activeTab = signal<string>('Songs');
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  // Playback needed by player-controls
  readonly isPlaying = signal<boolean>(false);
  currentProgress = signal<number>(33.3);


  // Song Library Core data for main-body look in data folder for data
  private playlist = inject(PlayListLogic);



  // Current Track
  //currentTrack = signal<Song | null>(this.playlist.displaySongList()[1] ?? null); // if this.songs[1] is undefined fall back to null
  currentTrack = signal<Song | null>(null);//test

  // Audio Visualizer Bars
  audioBars = signal<number[]>(Array(30).fill(0).map(() => Math.max(15, Math.floor(Math.random() * 100))));


  // Methods

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  togglePlayPause(): void {
    this.isPlaying.set(!this.isPlaying());
    // this makes my play button switch
  }


  previousSong(): void {
    const tracks = this.playlist.displaySongList().filter(song => !song.isPlaceholder);
    const current = this.currentTrack();

    if (!current) return;

    const currentIndex = tracks.findIndex(song => song.id === current.id);
    let prevIndex = currentIndex - 1;

    // Skip header or wrap around
    if (prevIndex < 0) {
      prevIndex = tracks.length - 1; //wrap to last one
    }

    const prevSong = tracks[prevIndex];
    if (prevSong) {
    this.currentTrack.set(prevSong);
    this.timeService.parseTime(prevSong.duration);
    } else {
      console.warn('No previous song found at index', prevIndex);
    }
  }

  //fix this it should mirror previous song
  nextSong(): void {
    const tracks = this.playlist.displaySongList().filter(song => !song.isPlaceholder);
    const current = this.currentTrack();

    //if no current track, start at first real song
    if(!current && tracks.length > 0) {
      this.currentTrack.set(tracks[0])
    }

    if (!current) return;

    const currentIndex = tracks.findIndex(song => song.id === current.id);
    let nextIndex = currentIndex + 1;

    // Skip header or wrap around
    if (nextIndex >= tracks.length) {
      nextIndex = 0; //wrap to the first song
    }
    const nextSong = tracks[nextIndex];
    if (nextSong) {
    this.currentTrack.set(nextSong);
    this.timeService.parseTime(nextSong.duration);
    } else {
      console.warn('No more songs found at index', nextIndex);
    }

  }
  play(): void {
    this.playbackStarted.set(true);
  }

  pause(): void {
    this.playbackStarted.set(false);
  }

}



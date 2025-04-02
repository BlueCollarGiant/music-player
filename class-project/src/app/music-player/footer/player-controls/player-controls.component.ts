
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song } from '../../Models/song.model';
import { MusicPlayerService } from '../../../services/music-player.service';



@Component({
  selector: 'app-player-controls',
  imports: [CommonModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  constructor(public musicService: MusicPlayerService) {}


  @Input() isPlaying!: boolean;
  @Input() currentProgress!: number;
  @Input() currentTrack!: Song;
  @Input() currentTime!: string;
  @Output() playPause = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  togglePlayPause() {
    this.playPause.emit();
  }
  goPrevious() {
    this.previous.emit();
  }

  goNext() {
    this.next.emit();
  }
}

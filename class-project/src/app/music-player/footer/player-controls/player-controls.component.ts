
import { Component, Input, Output, EventEmitter } from '@angular/core';//remove unused imports
import { CommonModule } from '@angular/common';
import { Song } from '../../Models/song.model'; //remove not used also look into why this isnt used.
import { MusicPlayerService } from '../../../services/music-player.service';



@Component({
  selector: 'app-player-controls',
  imports: [CommonModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  constructor(public musicService: MusicPlayerService) {}


  togglePlayPause() {
    this.musicService.togglePlayPause();
  }
  goPrevious() {
    this.musicService.previousSong();
  }

  goNext() {
    this.musicService.nextSong();
  }
}

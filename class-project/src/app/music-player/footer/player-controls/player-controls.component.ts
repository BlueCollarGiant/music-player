
import { Component, inject} from '@angular/core';//remove unused imports
import { CommonModule } from '@angular/common';
import { MusicPlayerService } from '../../../services/music-player.service';



@Component({
  selector: 'app-player-controls',
  imports: [CommonModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  public musicService = inject(MusicPlayerService);


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

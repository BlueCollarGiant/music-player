
import { Component, inject} from '@angular/core';//remove unused imports
import { MusicPlayerService } from '../../../services/music-player.service';
import { SharedModule } from '../../../shared/shared.module';



@Component({
  selector: 'app-player-controls',
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  public musicService = inject(MusicPlayerService);


  togglePlayPause(): void {
    const playing = this.musicService.isPlaying();
    console.log(playing ? 'Pause' : 'Play');
    this.musicService.togglePlayPause();
  }
  goPrevious() {
    this.musicService.previousSong();
  }

  goNext() {
    this.musicService.nextSong();
  }
  startPlayback(): void {
    this.musicService.play();
  }

  pausePlayback(): void {
    this.musicService.pause();
  }

}

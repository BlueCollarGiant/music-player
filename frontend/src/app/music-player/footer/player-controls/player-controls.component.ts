
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
  //-----Injections section-----//
  public musicService = inject(MusicPlayerService);

  //-----Methods section-----//
  togglePlayPause(): void {
    const playing = this.musicService.isPlaying();
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

  onProgressBarClick(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    // Clamp percentage between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    // Update the progress
    this.musicService.seekTo(clampedPercentage);
  }
}

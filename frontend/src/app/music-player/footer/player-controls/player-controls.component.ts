
import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { SharedModule } from '../../../shared/shared.module';

@Component({
  selector: 'app-player-controls',
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  //-----Injections-----//
  public musicService = inject(MusicPlayerService);

  //-----Methods-----//
  togglePlayPause(): void {
    this.musicService.togglePlayPause();
  }

  goPrevious(): void {
    this.musicService.previousSong();
  }

  goNext(): void {
    this.musicService.nextSong();
  }

  onProgressBarClick(event: MouseEvent): void {
    this.musicService.seekToFromProgressBar(event);
  }
}

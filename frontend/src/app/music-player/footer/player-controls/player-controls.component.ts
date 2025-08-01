
import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { SharedModule } from '../../../shared/shared.module';
import { PlaybackCoordinatorService } from '../../../services/playback-coordinator.service';

@Component({
  selector: 'app-player-controls',
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  //-----Injections-----//
  public musicService = inject(MusicPlayerService);
  public playbackCoordinator = inject(PlaybackCoordinatorService);

  //-----Methods-----//
  togglePlayPause(): void {
    this.musicService.togglePlayPause();
  }

  goPrevious(): void {
    this.playbackCoordinator.previousYouTubeSong();
  }

  goNext(): void {
    this.playbackCoordinator.nextYouTubeSong();
  }

  onProgressBarClick(event: MouseEvent): void {
    this.musicService.seekToFromProgressBar(event);
  }
}

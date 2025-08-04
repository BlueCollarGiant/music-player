
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

  /*onProgressBarClick(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    this.playbackCoordinator.seekTo(clampedPercentage);
  }*/
}

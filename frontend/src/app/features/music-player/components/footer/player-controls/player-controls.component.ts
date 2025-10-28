
import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../../../shared/shared.module';
import { PlaylistInstanceService } from '../../../../../core/playback/playlist-instance';
import { TransportControlsComponent } from './player-controls-components/transport-controls/transport-controls.component';
import { VolumeControlComponent } from './player-controls-components/volume-control/volume-control.component';
import { ProgressBarComponent } from './player-controls-components/progress-bar/progress-bar.component';
import { TimeDisplayComponent } from './player-controls-components/time-display/time-display.component';

@Component({
  selector: 'app-player-controls',
  standalone: true,
  imports: [
    SharedModule,
    TransportControlsComponent,
    VolumeControlComponent,
    ProgressBarComponent,
    TimeDisplayComponent
  ],
  templateUrl: './player-controls.component.html',
  styleUrls: ['./player-controls.component.css']
})
export class PlayerControlsComponent {
  // Single source for state + commands (no direct coordinator/store usage here)
  readonly c = inject(PlaylistInstanceService);

  // Transport control handlers
  onTogglePlayPause(): void {
    this.c.toggle();
  }

  onPrevious(): void {
    this.c.prev();
  }

  onNext(): void {
    this.c.next();
  }

  // Progress bar handlers
  onSeek(seconds: number): void {
    this.c.seek(seconds);
  }

  // Volume control handlers
  onVolumeChange(volume: number): void {
    this.c.setVolume(volume);
  }

  onToggleMute(): void {
    this.c.toggleMute();
  }
}

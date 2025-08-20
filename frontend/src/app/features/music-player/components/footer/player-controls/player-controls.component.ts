
import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../../../shared/shared.module';
import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { PlaybackCoordinatorService } from '../../../services/playback-coordinator.service';

@Component({
  selector: 'app-player-controls',
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css'
})
export class PlayerControlsComponent {
  //==================================================
  // SECTION: Dependency Injection (Shared UI Layer)
  //==================================================
  readonly musicService = inject(PlaybackStateStore);
  readonly playbackCoordinator = inject(PlaybackCoordinatorService);

  //==================================================
  // SECTION: Playback Control (Cross-platform via coordinator)
  //==================================================
  togglePlayPause(): void {
  this.playbackCoordinator.toggle();
  }

  //==================================================
  // SECTION: Track Navigation (Delegates to shared music service)
  //==================================================
  // TODO: wire previous/next through a track navigation service.
  goPrevious(): void { /* navigation service prev */ }
  goNext(): void { /* navigation service next */ }

  //==================================================
  // SECTION: Progress Interaction (Seeking)
  //==================================================
  onProgressBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  this.playbackCoordinator.seekPercent(pct);
  }


}


import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../../../shared/shared.module';
import { PlaylistInstanceService } from '../../../../../core/playback/playlist-instance';


@Component({
  selector: 'app-player-controls',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrls: ['./player-controls.component.css']
})
export class PlayerControlsComponent {
  // Single source for state + commands (no direct coordinator/store usage here)
  readonly c = inject(PlaylistInstanceService);;

  // UI actions (thin wrappers so template stays clean)
  toggle(): void {
    this.c.toggle();
  }

  prev(): void {
    this.c.prev();
  }

  next(): void {
    this.c.next();
  }

  // Click-to-seek: convert click position to seconds using facade duration()
  onProgressBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    const seconds = Math.floor((this.c.duration() || 0) * clamped);
    this.c.seek(seconds);
  }
}

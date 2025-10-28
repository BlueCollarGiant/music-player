import { Component, input, output } from '@angular/core';
import { SharedModule } from '../../../../../../../shared/shared.module';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.css']
})
export class ProgressBarComponent {
  // Inputs
  currentTime = input.required<number>(); // seconds
  duration = input.required<number>(); // seconds

  // Outputs
  seek = output<number>();

  // Click-to-seek: convert click position to seconds
  onProgressBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    const seconds = Math.floor((this.duration() || 0) * clamped);
    this.seek.emit(seconds);
  }

  // Calculate progress percentage for display
  getProgressPercentage(): number {
    return this.duration() ? (this.currentTime() / this.duration()) * 100 : 0;
  }
}

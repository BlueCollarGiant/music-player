import { Component, input, output } from '@angular/core';
import { SharedModule } from '../../../../../../../shared/shared.module';

@Component({
  selector: 'app-transport-controls',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './transport-controls.component.html',
  styleUrls: ['./transport-controls.component.css']
})
export class TransportControlsComponent {
  // Inputs
  isPlaying = input.required<boolean>();

  // Outputs
  previous = output<void>();
  togglePlayPause = output<void>();
  next = output<void>();

  // Event handlers
  onPrevious(): void {
    this.previous.emit();
  }

  onToggle(): void {
    this.togglePlayPause.emit();
  }

  onNext(): void {
    this.next.emit();
  }
}

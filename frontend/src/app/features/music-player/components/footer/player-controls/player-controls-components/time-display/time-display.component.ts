import { Component, input } from '@angular/core';
import { SharedModule } from '../../../../../../../shared/shared.module';

@Component({
  selector: 'app-time-display',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './time-display.component.html',
  styleUrls: ['./time-display.component.css']
})
export class TimeDisplayComponent {
  // Inputs
  currentTime = input.required<string>();
  duration = input.required<string>();
}

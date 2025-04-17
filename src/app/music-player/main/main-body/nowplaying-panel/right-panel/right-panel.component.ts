import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { VisualizerComponent } from './visualizer-container/visualizer/visualizer.component';

@Component({
  selector: 'app-right-panel',
  imports: [VisualizerComponent],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent {
  public musicService = inject(MusicPlayerService);
}

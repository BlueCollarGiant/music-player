import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../../../services/music-player.service';

@Component({
  selector: 'app-visualizer',
  imports: [],
  templateUrl: './visualizer.component.html',
  styleUrl: './visualizer.component.css'
})
export class VisualizerComponent {
  public musicService = inject(MusicPlayerService);
}

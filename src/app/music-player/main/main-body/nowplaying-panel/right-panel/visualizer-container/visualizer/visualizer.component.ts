import { Component, effect, inject, input,Signal } from '@angular/core';
import { MusicPlayerService } from '../../../../../../../services/music-player.service';

@Component({
  selector: 'app-visualizer',
  imports: [],
  templateUrl: './visualizer.component.html',
  styleUrl: './visualizer.component.css'
})
export class VisualizerComponent {

  readonly isPlaying = input.required<boolean>();
  readonly bars = Array.from({ length: 40 });





}

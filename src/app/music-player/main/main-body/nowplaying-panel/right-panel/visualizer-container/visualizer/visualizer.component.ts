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



  constructor() {
    effect(() => {
      const playing = this.isPlaying(); // Signal<boolean>(), called to get the value
      console.log(playing ? 'Play: true' : 'Pause: false');
    });
  }

}

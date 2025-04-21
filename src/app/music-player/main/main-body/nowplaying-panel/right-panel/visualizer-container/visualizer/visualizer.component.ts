import { Component, input } from '@angular/core';


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

// In each component, ensure you have:
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song } from '../../Models/song.model';


@Component({
  selector: 'app-main-body',
  imports: [CommonModule],
  templateUrl: './main-body.component.html',
  styleUrl: './main-body.component.css'
})
export class MainBodyComponent {
  @Input() songs: Song[] = [];
  @Input() currentTrack!: Song;
  @Input() audioBars!: number[];
}

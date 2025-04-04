// In each component, ensure you have:
import { Component,} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicPlayerService } from '../../../services/music-player.service';


@Component({
  selector: 'app-main-body',
  imports: [CommonModule],
  templateUrl: './main-body.component.html',
  styleUrl: './main-body.component.css'
})
export class MainBodyComponent {
  constructor(public musicService: MusicPlayerService) {}
}

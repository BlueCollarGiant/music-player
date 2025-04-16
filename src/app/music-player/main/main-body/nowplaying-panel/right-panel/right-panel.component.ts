import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';

@Component({
  selector: 'app-right-panel',
  imports: [],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.css'
})
export class RightPanelComponent {
  public musicService = inject(MusicPlayerService);
}

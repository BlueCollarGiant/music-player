// In each component, ensure you have:
import { Component, inject,} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MusicPlayerService } from '../../../services/music-player.service';
import { PlaylistPanelComponent } from './song-list-panel/playlist-panel/playlist-panel.component';


@Component({
  selector: 'app-main-body',
  imports: [CommonModule, PlaylistPanelComponent],
  templateUrl: './main-body.component.html',
  styleUrl: './main-body.component.css'
})
export class MainBodyComponent {
  public musicService = inject(MusicPlayerService);
}

import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { CommonModule } from '@angular/common';
import { PlayListLogic } from '../../../../../services/play-list-logic.service';

@Component({
  selector: 'app-playlist-panel',
  imports: [CommonModule],
  templateUrl: './playlist-panel.component.html',
  styleUrl: './playlist-panel.component.css'
})
export class PlaylistPanelComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)
}

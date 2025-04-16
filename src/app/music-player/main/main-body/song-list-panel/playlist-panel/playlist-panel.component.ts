import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../services/music-player.service';
import { PlayListLogic } from '../../../../../services/play-list-logic.service';
import { SongFormComponent } from './song-form/song-form.component';
import { SharedModule } from '../../../../../shared/shared.module';

@Component({
  selector: 'app-playlist-panel',
  imports: [SharedModule, SongFormComponent],
  templateUrl: './playlist-panel.component.html',
  styleUrl: './playlist-panel.component.css'
})
export class PlaylistPanelComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)




}

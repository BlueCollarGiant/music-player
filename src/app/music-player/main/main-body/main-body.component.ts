
import { Component, inject,} from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { PlaylistPanelComponent } from './song-list-panel/playlist-panel/playlist-panel.component';
import { SharedModule } from '../../../shared/shared.module';
import { RightPanelComponent } from './nowplaying-panel/right-panel/right-panel.component';


@Component({
  selector: 'app-main-body',
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './main-body.component.html',
  styleUrl: './main-body.component.css'
})
export class MainBodyComponent {
  public musicService = inject(MusicPlayerService);
}

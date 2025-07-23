import { Component } from '@angular/core';
import { PlaylistPanelComponent } from '../main-body/song-list-panel/playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../main-body/nowplaying-panel/right-panel/right-panel.component';
import { SharedModule } from '../../../shared/shared.module';

@Component({
  selector: 'app-youtube',
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
  templateUrl: './youtube.component.html',
  styleUrl: './youtube.component.css'
})
export class YoutubeComponent {

}

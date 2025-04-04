import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MusicPlayerService } from './services/music-player.service';
import { NavBarComponent } from './music-player/header/nav-bar/nav-bar.component';
import { MainBodyComponent } from './music-player/main/main-body/main-body.component';
import { PlayerControlsComponent } from './music-player/footer/player-controls/player-controls.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavBarComponent, MainBodyComponent, PlayerControlsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'class-project';
  constructor(public musicService: MusicPlayerService) {}
}


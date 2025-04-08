
import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  public musicService =  inject(MusicPlayerService);


  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  setActiveTab(tab: string) {
    this.musicService.setActiveTab(tab);
  }
}

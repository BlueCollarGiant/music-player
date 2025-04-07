// In each component, ensure you have:
import { Component, Output, EventEmitter } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  constructor(public musicService: MusicPlayerService) {}
//dont like this below figure out removal.
  @Output() tabChanged = new EventEmitter<string>();

  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  setActiveTab(tab: string) {
    this.tabChanged.emit(tab);
  }
}

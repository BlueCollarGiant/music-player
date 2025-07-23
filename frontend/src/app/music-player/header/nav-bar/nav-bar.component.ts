
import { Component, inject, signal } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  public musicService = inject(MusicPlayerService);

  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];
  isMobileMenuOpen = signal(false);

  setActiveTab(tab: string) {
    this.musicService.setActiveTab(tab);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  setActiveTabMobile(tab: string) {
    this.setActiveTab(tab);
    this.closeMobileMenu();
  }
}

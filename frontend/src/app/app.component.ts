import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MusicPlayerService } from './services/music-player.service';
import { NavBarComponent } from './music-player/header/nav-bar/nav-bar.component';
import { PlayerControlsComponent } from './music-player/footer/player-controls/player-controls.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, PlayerControlsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'class-project';
  private router = inject(Router);
  currentRoute = signal('');

  constructor(public musicService: MusicPlayerService) {
    // Track current route to show/hide player controls
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.url);
    });
    
    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  // Only show player controls on the music player page
  showPlayerControls(): boolean {
    return this.currentRoute() === '/player';
  }
}


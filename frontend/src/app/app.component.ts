import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PlaybackStateStore } from './core/playback/playback-state.store';
import { NavBarComponent } from './features/music-player/components/header/nav-bar/nav-bar.component';
import { PlayerControlsComponent } from './features/music-player/components/footer/player-controls/player-controls.component';

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

  constructor(public musicService: PlaybackStateStore) {
    // Track current route to show/hide player controls
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.url);
    });
    
    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  // Only show player controls on music platform pages
  showPlayerControls(): boolean {
    const route = this.currentRoute();
    if (route === '/player' || route === '/youtube') return true;
    // Hide on management screens that are not the player itself
    if (route.startsWith('/platform/local/library')) return false;
    // Show on any platform route (e.g., /platform/spotify, /platform/youtube)
    return route.startsWith('/platform/');
  }
}


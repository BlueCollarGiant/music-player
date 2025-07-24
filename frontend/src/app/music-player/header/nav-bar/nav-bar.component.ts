
import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MusicPlayerService } from '../../../services/music-player.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  public musicService = inject(MusicPlayerService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];
  isMobileMenuOpen = signal(false);
  currentRoute = signal('');
  
  // Auth state from service
  isUserLoggedIn = this.authService.isAuthenticated;
  username = this.authService.username;
  userAvatar = this.authService.avatarUrl;
  connectedPlatforms = this.authService.connectedPlatformNames;

  constructor() {
    // Track current route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.url);
    });
    
    // Set initial route
    this.currentRoute.set(this.router.url);

    // Listen for custom event to open hamburger menu (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('openHamburgerMenu', () => {
        this.isMobileMenuOpen.set(true);
      });
    }
  }

  // Route checking methods
  isHomeActive(): boolean {
    return this.currentRoute() === '/';
  }

  isPlayerActive(): boolean {
    return this.currentRoute() === '/player';
  }

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

  // Authentication methods using AuthService
  openLogin() {
    // Redirect to Google OAuth
    this.authService.loginWithGoogle();
    this.closeMobileMenu();
  }

  openManualLogin() {
    // TODO: Open manual login/signup modal for users without Gmail
    console.log('Opening manual login/signup modal...');
    // For now, just show an alert - you can implement a modal later
    alert('Manual login/signup form coming soon! For now, please use Google login.');
    this.closeMobileMenu();
  }

  loginWithGoogle() {
    // Prevent re-authentication if already logged in
    if (this.isUserLoggedIn()) {
      return;
    }
    
    // Google OAuth login
    this.authService.loginWithGoogle();
    this.closeMobileMenu();
  }

  openSignup() {
    // Same as manual login since it handles both
    this.openManualLogin();
  }

  async logout() {
    await this.authService.logout();
    this.closeMobileMenu();
  }

  // Platform connection methods using AuthService
  isPlatformConnected(platform: string): boolean {
    return this.authService.isPlatformConnected(platform);
  }

  connectPlatform(platform: string) {
    if (!this.isPlatformConnected(platform)) {
      switch (platform) {
        case 'youtube':
          this.authService.connectYouTube();
          break;
        case 'spotify':
          this.authService.connectSpotify();
          break;
        case 'soundcloud':
          this.authService.connectSoundCloud();
          break;
        default:
          console.warn(`Platform ${platform} not supported`);
      }
    }
    this.closeMobileMenu();
  }
}

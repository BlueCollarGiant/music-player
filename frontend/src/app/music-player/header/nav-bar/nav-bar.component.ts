
import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MusicPlayerService } from '../../../services/music-player.service';
import { AuthService } from '../../../services/auth.service';
import { YouTubeService } from '../../../services/youtube.service';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  public musicService = inject(MusicPlayerService);
  public authService = inject(AuthService);
  private youtubeService = inject(YouTubeService);
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

  // Computed property for display username (fallback to email prefix if generic)
  displayUsername = computed(() => {
    const currentUsername = this.username();
    const currentUser = this.authService.currentUser();
    
    // If username is generic (starts with "user_") and we have email, use email prefix
    if (currentUsername && currentUsername.startsWith('user_') && currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    
    return currentUsername || 'User';
  });

  // Check if user is connected via OAuth (has oauth_provider)
  isOAuthConnected = computed(() => {
    const currentUser = this.authService.currentUser();
    return !!(currentUser?.oauth_provider);
  });

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
    // Open manual login/signup modal for users without Gmail
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
        default:
          console.warn(`Platform ${platform} not supported`);
      }
    }
    this.closeMobileMenu();
  }

  async disconnectPlatform(platform: string) {
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to disconnect ${platform}? This will remove access to your ${platform} playlists.`);
    
    if (confirmed) {
      try {
        await this.authService.disconnectPlatform(platform);
        console.log(`Successfully disconnected from ${platform}`);
      } catch (error) {
        console.error(`Failed to disconnect from ${platform}:`, error);
        alert(`Failed to disconnect from ${platform}. Please try again.`);
      }
    }
    this.closeMobileMenu();
  }

  // Handle platform button click - connect or disconnect based on current state
  handlePlatformClick(platform: string) {
    if (this.isPlatformConnected(platform)) {
      this.disconnectPlatform(platform);
    } else {
      this.connectPlatform(platform);
    }
  }

  // Navigate to YouTube page and auto-load playlists
  goToYouTube() {
    if (!this.isPlatformConnected('youtube')) {
      alert('YouTube not connected! Please connect YouTube first.');
      return;
    }

    // Auto-load YouTube playlists when navigating to YouTube
    console.log('🎵 Auto-loading YouTube playlists...');
    this.youtubeService.loadPlaylists();

    this.router.navigate(['/youtube']);
    this.closeMobileMenu();
  }

  // Handle YouTube button click - auto-load playlists if connected
  handleYouTubeClick() {
    if (this.isPlatformConnected('youtube')) {
      // User is connected, auto-load playlists
      console.log('🎵 YouTube connected, auto-loading playlists...');
      this.youtubeService.loadPlaylists();
      this.goToYouTube();
    } else {
      // User not connected, connect first
      this.connectPlatform('youtube');
    }
  }
}

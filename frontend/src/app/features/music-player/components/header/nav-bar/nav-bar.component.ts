
import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { AuthService } from '../../../../../core/auth/auth.service';
import { environment } from '../../../../../../environments/environment';

type PlatformKind = 'youtube' | 'spotify' | 'soundcloud';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent {
  // --- DI & simple bindings ---
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  environment = environment;
  musicService = inject(PlaybackStateStore);
  authService = inject(AuthService);

  // --- UI state ---
  isMobileMenuOpen = signal(false);
  

  // --- Auth state (signals from AuthService) ---
  isUserLoggedIn = this.authService.isAuthenticated;
  username = this.authService.username;
  connectedPlatforms = this.authService.connectedPlatformNames;

  displayUsername = computed(() => {
    const uname = this.username();
    const user = this.authService.currentUser();
    if (uname?.startsWith('user_') && user?.email) return user.email.split('@')[0];
    return uname || 'User';
  });

  avatarSrc = computed(() => {
    const url = this.authService.avatarUrl();
    return url?.trim()
      ? url
      : `${this.environment.apiUrl}/assets/avatars/default-avatar.png`;
  });

  constructor() {// open drawer via global event (browser only)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('openHamburgerMenu', () => this.isMobileMenuOpen.set(true));
    }
  }

 
  // --- Drawer ---
  toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
  closeMobileMenu() { this.isMobileMenuOpen.set(false); }

  // --- Auth actions ---
  openManualLogin() { alert('Manual login/signup coming soon.'); this.closeMobileMenu(); }
  async logout() { await this.authService.logout(); this.closeMobileMenu(); }

  // --- Platform connection helpers ---
  isOAuthConnected(platform?: PlatformKind): boolean {
  if (platform) {
    return this.authService.isPlatformConnected(platform);
  }
  return !!this.authService.currentUser()?.oauth_provider;
}

  /** Navigate to /platform/:platform and set theme/state. */
  navigatePlatform(platform: PlatformKind): void {
    this.router.navigate(['/platform', platform]);
    this.closeMobileMenu();
  }

  // Keep for disconnect buttons 
  async disconnectPlatform(p: PlatformKind) {
    if (!confirm(`Disconnect ${p}?`)) return;
    try {
      await this.authService.disconnectPlatform(p);
      alert(`Disconnected ${p}.`);
    } catch {
      alert(`Failed to disconnect ${p}.`);
    }
    this.closeMobileMenu();
  }
  isPlatformConnected(platform: PlatformKind): boolean {
    return this.authService.isPlatformConnected(platform);
  }
}
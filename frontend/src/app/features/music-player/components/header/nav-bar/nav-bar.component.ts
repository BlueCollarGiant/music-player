
import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

// import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store'; // unused
import { AuthService } from '../../../../../core/auth/auth.service';
import { environment } from '../../../../../../environments/environment';

type PlatformKind = 'youtube' | 'spotify' | 'soundcloud' | 'omniplay';

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
  
  authService = inject(AuthService);

  // --- UI state ---
  isMobileMenuOpen = signal(false);
  currentUrl = signal(this.router.url);
  isOnPlatformRoute = computed(() => this.currentUrl().startsWith('/platform/'));
  

  // --- Auth state (signals from AuthService) ---
  isUserLoggedIn = this.authService.isAuthenticated;
  username = this.authService.username;
  

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
      // Track route to show/hide Back to Landing
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.currentUrl.set(event.urlAfterRedirects || event.url);
        }
      });
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

  /** Navigate back to landing page */
  navigateLanding(): void {
    this.router.navigate(['/landing']);
    this.closeMobileMenu();
  }

  /** Remember current route before leaving for an external auth flow */
  captureReturnUrl(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const targetUrl = this.currentUrl();
    const fallback = window.location.pathname + window.location.search + window.location.hash;
    localStorage.setItem('pre_auth_url', targetUrl || fallback || '/landing');
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

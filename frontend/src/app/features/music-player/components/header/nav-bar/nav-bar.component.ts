
import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, RouterLink, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

import { PlaybackStateStore } from '../../../../../core/playback/playback-state.store';
import { AuthService } from '../../../../../core/auth/auth.service';
import { PlatformStateService } from '../../../../../core/platform-state/platform-state.service';
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
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private platformState = inject(PlatformStateService);

  environment = environment;
  musicService = inject(PlaybackStateStore);
  authService = inject(AuthService);

  // --- UI state ---
  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];
  isMobileMenuOpen = signal(false);
  currentRoute = signal(this.router.url);

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

  constructor() {
    // track route changes for active state
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => this.currentRoute.set(e.urlAfterRedirects));

    // open drawer via global event (browser only)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('openHamburgerMenu', () => this.isMobileMenuOpen.set(true));
    }
  }

  // --- Route helpers ---
  onPlatformRoute(): boolean {
    return this.router.url.startsWith('/platform/');
  }

  isCurrentPlatform(p: PlatformKind): boolean {
    const seg =
      this.route.snapshot.paramMap.get('platform') ??
      this.route.firstChild?.snapshot.paramMap.get('platform') ??
      this.router.url.split('/')[2]; // /platform/<seg>
    return seg === p;
  }

  isHomeActive(): boolean { return this.currentRoute() === '/'; }
  isPlayerActive(): boolean { return this.onPlatformRoute(); }

  // --- Tabs ---
  setActiveTab(tab: string) { this.musicService.setActiveTab(tab); }
  setActiveTabMobile(tab: string) { this.setActiveTab(tab); this.closeMobileMenu(); }

  // --- Drawer ---
  toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
  closeMobileMenu() { this.isMobileMenuOpen.set(false); }

  // --- Auth actions ---
  openManualLogin() { alert('Manual login/signup coming soon.'); this.closeMobileMenu(); }
  openLogin() { this.authService.loginWithGoogle(); this.closeMobileMenu(); }
  async logout() { await this.authService.logout(); this.closeMobileMenu(); }

  // --- Platform connection helpers (template uses these) ---
  /** True if the given platform is connected for this user (OAuth completed). */
  isOAuthConnected(platform?: PlatformKind): boolean {
  if (platform) {
    return this.authService.isPlatformConnected(platform);
  }
  return !!this.authService.currentUser()?.oauth_provider;
}

  /** Navigate to /platform/:platform and set theme/state. */
  navigatePlatform(platform: PlatformKind): void {
    this.platformState.set(platform);
    this.router.navigate(['/platform', platform]);
    this.closeMobileMenu();
  }

  // Keep for disconnect buttons in the drawer
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
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NoticeSectionComponent } from './landing-content/notice-section/notice-section.component';
import { HeroSectionComponent } from './landing-content/hero-section/hero-section.component';
import { FeaturesSectionComponent } from './landing-content/features-section/features-section.component';
import { BackToTopComponent } from './landing-content/back-to-top/back-to-top.component';
import { BuildCreditComponent } from './landing-content/build-credit/build-credit.component';

@Component({
  selector: 'app-landing',
  imports: [
    NoticeSectionComponent,
    HeroSectionComponent,
    FeaturesSectionComponent,
    BackToTopComponent,
    BuildCreditComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  public authService = inject(AuthService);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const youtubeConnected = url.searchParams.get('youtube_connected') === 'true';
    const spotifyConnected = url.searchParams.get('spotify_connected') === 'true';

    if (token) {
      this.authService.handleOAuthCallback(token).then(() => {
        this.handleAuthReturn(url, ['token']);
      }).catch(error => {
        console.error('OAuth callback failed:', error);
      });
      return;
    }

    if (youtubeConnected || spotifyConnected) {
      this.authService.refreshUserData().catch(error => {
        console.error('Failed to refresh user data after platform connection:', error);
      }).finally(() => {
        const paramsToClear = [
          youtubeConnected ? 'youtube_connected' : undefined,
          spotifyConnected ? 'spotify_connected' : undefined,
        ].filter((param): param is string => !!param);

        const fallbackRoute = this.determineFallbackRoute(youtubeConnected, spotifyConnected);
        this.handleAuthReturn(url, paramsToClear, { fallbackRoute });
      });
    }
  }

  private handleAuthReturn(
    url: URL,
    paramsToClear: string[] = [],
    options: { fallbackRoute?: string | null } = {}
  ): void {
    const storedReturnUrl = localStorage.getItem('pre_auth_url') || '/landing';
    localStorage.removeItem('pre_auth_url');

    paramsToClear.forEach(param => url.searchParams.delete(param));
    const remainingQuery = url.searchParams.toString();
    const cleanUrl = `${url.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${url.hash}`;
    window.history.replaceState({}, '', cleanUrl);

    const currentPathWithQuery = window.location.pathname + window.location.search;
    const normalizedStored = this.normalizeRoute(storedReturnUrl);
    const shouldNavigate = normalizedStored !== '/landing' && normalizedStored !== currentPathWithQuery;

    let destination: string | null = null;
    if (shouldNavigate) {
      destination = normalizedStored;
    } else if (options.fallbackRoute) {
      destination = options.fallbackRoute;
    }

    if (destination) {
      console.log('[LandingComponent] Auth flow returning user to:', destination);
      this.router.navigateByUrl(destination);
      return;
    }

    window.dispatchEvent(new Event('openHamburgerMenu'));
    console.log('[LandingComponent] Auth flow complete, staying on landing page');
  }

  private determineFallbackRoute(youtubeConnected: boolean, spotifyConnected: boolean): string | null {
    const connected = this.authService.connectedPlatformNames();

    if (youtubeConnected && connected.includes('youtube')) {
      return '/platform/youtube';
    }

    if (spotifyConnected && connected.includes('spotify')) {
      return '/platform/spotify';
    }

    if (connected.includes('spotify') && connected.includes('youtube')) {
      return '/platform/omniplay';
    }

    if (connected.includes('youtube')) {
      return '/platform/youtube';
    }

    if (connected.includes('spotify')) {
      return '/platform/spotify';
    }

    return null;
  }

  private normalizeRoute(route: string): string {
    if (!route) {
      return '/landing';
    }

    try {
      if (route.startsWith('http://') || route.startsWith('https://')) {
        const parsed = new URL(route);
        return (parsed.pathname || '/landing') + (parsed.search || '') + (parsed.hash || '');
      }
    } catch {
      // Ignore invalid URLs and fall through to default logic
    }

    return route.startsWith('/') ? route : `/${route}`;
  }
}

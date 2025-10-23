import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { NoticeSectionComponent } from '../notice-section/notice-section.component';
import { HeroSectionComponent } from '../hero-section/hero-section.component';
import { FeaturesSectionComponent } from '../features-section/features-section.component';
import { BackToTopComponent } from '../back-to-top/back-to-top.component';
import { BuildCreditComponent } from '../build-credit/build-credit.component';

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
  public authService = inject(AuthService);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (token) {
        this.authService.handleOAuthCallback(token).then(() => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openHamburgerMenu'));
          }, 500);
          window.history.replaceState({}, document.title, '/landing');
        }).catch(error => {
          console.error('OAuth callback failed:', error);
        });
      }
    }
  }
}

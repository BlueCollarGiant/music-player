import { Component, ElementRef, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';



@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  @ViewChild('featuresSection') featuresSection!: ElementRef;
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);


  ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) { 
      this.authService.handleOAuthCallback(token).then(() => {

        // Optionally auto-open hamburger to show logged-in state
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openHamburgerMenu'));
        }, 500);
        // Clean up URL
        window.history.replaceState({}, document.title, '/landing');
      }).catch(error => {
        console.error('OAuth callback failed:', error);
      });
    }
  }
}
  scrollToFeatures() {
    this.featuresSection.nativeElement.scrollIntoView({
      behavior: 'smooth'
    });
  }

  startListening() {
    // Just trigger hamburger menu without navigating away from landing page
    if (isPlatformBrowser(this.platformId)) {
      window.dispatchEvent(new CustomEvent('openHamburgerMenu'));
    }
  }
  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  loginWithYouTube() {
    window.location.href = `${environment.apiUrl}/auth/youtube`; // or whatever route you have
  }
}

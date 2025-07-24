import { Component, ElementRef, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../services/auth.service';



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
    window.location.href = 'http://localhost:3000/auth/youtube'; // or whatever route you have
  }
}

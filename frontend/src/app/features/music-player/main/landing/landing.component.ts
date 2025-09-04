import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);
  showBackToTop = false;
  // Carousel state
  carouselImages: { src: string; alt: string }[] = [
    { src: 'assets/carousel/abby-dinosaur.jpg', alt: 'Toy dinosaur with headphones enjoying music vibes' },
    { src: 'assets/carousel/alex-lujan.jpg', alt: 'Musician playing guitar under warm lighting' },
    { src: 'assets/carousel/blocks.jpg', alt: 'Colorful abstract audio block visualization' },
    { src: 'assets/carousel/marcela-laskoski.jpg', alt: 'Close up of vinyl record spinning on turntable' },
    { src: 'assets/carousel/rupam-dutta.jpg', alt: 'DJ mixing console with glowing controls at night' },
    { src: 'assets/carousel/simon-noh-0rmby.jpg', alt: 'Crowd at live concert with dramatic stage lights' }
  ];
  currentIndex = 0;
  private carouselTimer: any;
  private scrollHandler = () => {
    if (!isPlatformBrowser(this.platformId)) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    const next = y > 600;
    if (next !== this.showBackToTop) this.showBackToTop = next;
  };

  // Attempt to locate the real vertical scrolling container (fallback to window)
  private getScrollRoot(): (Window | HTMLElement) {
    if (!isPlatformBrowser(this.platformId)) return window;
    // Start from landing container if present
    const landing = document.querySelector('.landing-container') as HTMLElement | null;
    const start = landing?.parentElement || document.body;
    let el: HTMLElement | null = start as HTMLElement;
    while (el) {
      const style = getComputedStyle(el);
      const canScroll = el.scrollHeight - el.clientHeight > 2;
      if (canScroll && /(auto|scroll)/.test(style.overflowY)) {
        return el;
      }
      el = el.parentElement;
    }
    return window;
  }


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
    // attach scroll listener lazily
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    this.scrollHandler();
    this.startCarousel();
  }


  startListening() {
    // Just trigger hamburger menu without navigating away from landing page
    if (isPlatformBrowser(this.platformId)) {
      window.dispatchEvent(new CustomEvent('openHamburgerMenu'));
    }
  }

  private startCarousel() {
    if (this.carouselImages.length < 2) return; // nothing to rotate
    // clear any existing (safety)
    if (this.carouselTimer) clearInterval(this.carouselTimer);
    this.carouselTimer = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.carouselImages.length;
    }, 6000); // 6s per requirement
  }

  scrollToTop() {
    if (isPlatformBrowser(this.platformId)) {
      const root = this.getScrollRoot();
      if (root instanceof Window) {
        try { root.scrollTo({ top: 0, behavior: 'smooth' }); } catch { root.scrollTo(0,0); }
      } else {
        try { root.scrollTo({ top: 0, behavior: 'smooth' }); } catch { root.scrollTop = 0; }
      }
      // Hard fallback after animation frame sequence
      requestAnimationFrame(() => setTimeout(() => {
        if (document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      }, 400));
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollHandler);
      if (this.carouselTimer) clearInterval(this.carouselTimer);
    }
  }
}

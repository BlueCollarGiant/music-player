import { Component, inject, PLATFORM_ID, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-hero-section',
  imports: [],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);

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

  ngOnInit() {
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

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.carouselTimer) clearInterval(this.carouselTimer);
    }
  }
}

import { Component, inject, PLATFORM_ID, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-back-to-top',
  imports: [],
  templateUrl: './back-to-top.component.html',
  styleUrl: './back-to-top.component.css',
})
export class BackToTopComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  showBackToTop = false;

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
    // attach scroll listener lazily
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    this.scrollHandler();
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
    }
  }
}

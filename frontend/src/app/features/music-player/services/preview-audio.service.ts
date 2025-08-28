import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreviewAudioService {
  private audio?: HTMLAudioElement;

  readonly isPlaying   = signal(false);
  readonly progressPct = signal(0);
  readonly currentSec  = signal(0);

  play(url: string): void {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('ended', () => this.isPlaying.set(false));
      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio) return;
        const dur = this.audio.duration || 30;
        const cur = this.audio.currentTime || 0;
        this.currentSec.set(cur);
        if (dur > 0) this.progressPct.set((cur / dur) * 100);
      });
    }
    try {
      this.audio.src = url;
      this.audio.currentTime = 0;
      this.audio.play().then(() => this.isPlaying.set(true)).catch(() => this.isPlaying.set(false));
    } catch {
      this.isPlaying.set(false);
    }
  }

  pause(): void { this.audio?.pause(); this.isPlaying.set(false); }

  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying.set(false);
    this.progressPct.set(0);
    this.currentSec.set(0);
  }

  seekPercent(pct: number): void {
    if (!this.audio) return;
    const dur = this.audio.duration || 30;
    const clamped = Math.max(0, Math.min(100, pct));
    this.audio.currentTime = (clamped / 100) * dur;
    this.progressPct.set(clamped);
  }
}


import { Component, inject, OnDestroy, NgZone } from '@angular/core';
import { SharedModule } from '../../../../../shared/shared.module';
import { PlaylistInstanceService } from '../../../../../core/playback/playlist-instance';


@Component({
  selector: 'app-player-controls',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './player-controls.component.html',
  styleUrls: ['./player-controls.component.css']
})
export class PlayerControlsComponent implements OnDestroy {
  // Single source for state + commands (no direct coordinator/store usage here)
  readonly c = inject(PlaylistInstanceService);;
  private readonly zone = inject(NgZone);
  // Expose Math for template bindings (e.g., Math.round)
  readonly Math = Math;

  // UI actions (thin wrappers so template stays clean)
  toggle(): void {
    this.c.toggle();
  }

  prev(): void {
    this.c.prev();
  }

  next(): void {
    this.c.next();
  }

  // Click-to-seek: convert click position to seconds using facade duration()
  onProgressBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    const seconds = Math.floor((this.c.duration() || 0) * clamped);
    this.c.seek(seconds);
  }

  // Volume controls
  toggleMute(): void {
    this.c.toggleMute();
  }

  onVolumeBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    this.c.setVolume(clamped);
  }

  // ---- Drag to adjust volume ----
  private volDragging = false;
  private volbarEl?: HTMLElement;
  private rafId: number | null = null;
  private pendingClientX: number | null = null;
  private lastSentVolume = this.c.volume();

  private updateNowFromClientX(clientX: number) {
    if (!this.volbarEl) return;
    const rect = this.volbarEl.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    // Skip tiny changes to reduce churn
    if (Math.abs(clamped - this.lastSentVolume) < 0.005) return;
    this.lastSentVolume = clamped;
    // Enter Angular zone only when updating state
    this.zone.run(() => this.c.setVolume(clamped));
  }

  private scheduleUpdate(clientX: number) {
    this.pendingClientX = clientX;
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.pendingClientX != null) {
        this.updateNowFromClientX(this.pendingClientX);
      }
    });
  }

  onVolPointerDown(event: MouseEvent): void {
    this.volDragging = true;
    this.volbarEl = event.currentTarget as HTMLElement;
    this.scheduleUpdate(event.clientX);
    // Run listeners outside Angular for smoother perf
    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onVolPointerMove, { passive: true });
      window.addEventListener('mouseup', this.onVolPointerUp, { passive: true });
    });
    event.preventDefault();
  }

  private onVolPointerMove = (event: MouseEvent) => {
    if (!this.volDragging) return;
    this.scheduleUpdate(event.clientX);
  };

  private onVolPointerUp = (event: MouseEvent) => {
    if (!this.volDragging) return;
    this.scheduleUpdate(event.clientX);
    this.volDragging = false;
    this.volbarEl = undefined;
    window.removeEventListener('mousemove', this.onVolPointerMove);
    window.removeEventListener('mouseup', this.onVolPointerUp);
  };

  onVolTouchStart(event: TouchEvent): void {
    this.volDragging = true;
    this.volbarEl = event.currentTarget as HTMLElement;
    const t = event.touches[0] || event.changedTouches[0];
    if (t) this.scheduleUpdate(t.clientX);
    // With touch-action: none in CSS, these can be passive
    this.zone.runOutsideAngular(() => {
      window.addEventListener('touchmove', this.onVolTouchMove, { passive: true });
      window.addEventListener('touchend', this.onVolTouchEnd, { passive: true });
      window.addEventListener('touchcancel', this.onVolTouchEnd, { passive: true });
    });
    event.preventDefault();
  }

  private onVolTouchMove = (event: TouchEvent) => {
    if (!this.volDragging) return;
    const t = event.touches[0] || event.changedTouches[0];
    if (t) this.scheduleUpdate(t.clientX);
  };

  private onVolTouchEnd = (event: TouchEvent) => {
    if (!this.volDragging) return;
    const t = event.touches[0] || event.changedTouches[0];
    if (t) this.scheduleUpdate(t.clientX);
    this.volDragging = false;
    this.volbarEl = undefined;
    window.removeEventListener('touchmove', this.onVolTouchMove);
    window.removeEventListener('touchend', this.onVolTouchEnd);
    window.removeEventListener('touchcancel', this.onVolTouchEnd);
  };

  ngOnDestroy(): void {
    // Cleanup any dangling listeners
    window.removeEventListener('mousemove', this.onVolPointerMove);
    window.removeEventListener('mouseup', this.onVolPointerUp);
    window.removeEventListener('touchmove', this.onVolTouchMove);
    window.removeEventListener('touchend', this.onVolTouchEnd);
    window.removeEventListener('touchcancel', this.onVolTouchEnd);
  }
}

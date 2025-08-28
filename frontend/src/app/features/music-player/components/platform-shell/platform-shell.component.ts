import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { PlaylistPanelComponent } from '../playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../right-panel/right-panel.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { YouTubeService } from '../../../music-player/services/youtube.service';
import { SpotifyService } from '../../../music-player/services/spotify.service';
import { SharedModule } from '../../../../shared/shared.module';

type PlatformName = 'youtube' | 'spotify' | 'soundcloud';

@Component({
  standalone: true,
  selector: 'app-platform-shell',
  templateUrl: './platform-shell.component.html',
  styleUrls: ['./platform-shell.component.css'],
  imports: [SharedModule, PlaylistPanelComponent, RightPanelComponent],
})
export class PlatformShellComponent implements OnInit, OnDestroy {
  // DI
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService);

  private sub = new Subscription();
  platform: PlatformName = 'youtube';
  @HostBinding('class')
  get hostClass() {
    return `platform-shell platform--${this.platform}`;
  }

  ngOnInit(): void {
    // set once and react to in-app route changes (same component instance)
    this.applyPlatformFromRoute();
    this.sub.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.applyPlatformFromRoute();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // -------- internal helpers --------
  private applyPlatformFromRoute(): void {
    const detected = this.resolvePlatformFromUrl();
    if (detected && detected !== this.platform) {
  this.platform = detected;
      this.loadPlaylistsFor(detected);
      return;
    }

    
  
    this.loadPlaylistsFor(this.platform);
  }

  private resolvePlatformFromUrl(): PlatformName {
    const url = this.router.url.toLowerCase();
    let detected: PlatformName;
    if (url.includes('/platform/spotify')) {
      detected = 'spotify';
    } else if (url.includes('/platform/youtube')) {
      detected = 'youtube';
    } else if (url.includes('/platform/soundcloud')) {
      detected = 'soundcloud';
    } else {
      detected = 'youtube';
    }
  
    return detected;
  }

  private loadPlaylistsFor(p: PlatformName): void {
    if (p === 'youtube') {
      if (this.auth.isPlatformConnected('youtube')) {
        this.yt.loadPlaylists();
      }
      return;
    }
    if (p === 'spotify') {
      if (this.auth.isPlatformConnected('spotify')) {
  try { (this.sp as any).ensureSdkLoaded?.(); } catch {}
        this.sp.loadPlaylists?.();
      }
      return;
    }
    // soundcloud: future hoo
  }

  
}
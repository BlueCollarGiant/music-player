import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';


import { PlaylistPanelComponent } from '../playlist-panel/playlist-panel.component';
import { RightPanelComponent } from '../right-panel/right-panel.component';

import { AuthService } from '../../../../core/auth/auth.service';
import { PlatformStateService } from '../../../../core/platform-state/platform-state.service';
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
  private readonly platformState = inject(PlatformStateService);
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService);

  private sub = new Subscription();

  // exposed to template
  platform: PlatformName = 'youtube';
  isYouTube = true;

  // host class for theme hooks: .platform--youtube | .platform--spotify | .platform--soundcloud
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
      this.isYouTube = detected === 'youtube';
      this.platformState.set(detected);
      this.loadPlaylistsFor(detected);
      return;
    }

    // initial mount or unchanged: still ensure state + playlists once
    this.platformState.set(this.platform);
    this.loadPlaylistsFor(this.platform);
  }

  private resolvePlatformFromUrl(): PlatformName {
    // expecting routes like /platform/:name/...
    const parentSeg = this.route.parent?.snapshot.url[0]?.path;
    const seg = (this.route.snapshot.url[0]?.path || '').toLowerCase();

    // if mounted under /platform/*
    if (parentSeg === 'platform') {
      if (seg === 'spotify' || seg === 'soundcloud' || seg === 'youtube') {
        return seg as PlatformName;
      }
    }

    // fallback: try first child segment if shell is parent
    const firstChildSeg = this.route.firstChild?.snapshot.url[0]?.path?.toLowerCase();
    if (firstChildSeg === 'spotify' || firstChildSeg === 'soundcloud' || firstChildSeg === 'youtube') {
      return firstChildSeg as PlatformName;
    }

    return 'youtube';
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
        this.sp.loadPlaylists?.();
      }
      return;
    }
    // soundcloud: future hook
  }
}
import { Routes } from '@angular/router';
import { OauthCallbackComponent } from './oauth-callback/oauth-callback.component';
import { LandingComponent } from './music-player/main/landing/landing.component';
import { YoutubeComponent } from './music-player/main/youtube/youtube.component';
import { PlatformShellComponent } from './music-player/components/platform-shell.component';
export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'youtube', component: YoutubeComponent },

  //new scoped are :/platform/*
  { path: 'platform', component: PlatformShellComponent, children: [
      { path: 'youtube', component: YoutubeComponent },
  // Temporarily reuse YoutubeComponent for other platforms until their POVs exist
  { path: 'spotify', component: YoutubeComponent },
  { path: 'soundcloud', component: YoutubeComponent },
      { path: 'platform' , redirectTo: 'youtube'}
    ]
  },
  { path: 'auth/callback', component: OauthCallbackComponent },
  { path: '**', redirectTo: '' }
];

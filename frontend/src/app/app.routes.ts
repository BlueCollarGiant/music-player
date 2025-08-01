import { Routes } from '@angular/router';
import { OauthCallbackComponent } from './oauth-callback/oauth-callback.component';
import { LandingComponent } from './music-player/main/landing/landing.component';
import { YoutubeComponent } from './music-player/main/youtube/youtube.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent  // Landing page as default
  },
  {
    path: 'landing',
    component: LandingComponent
  },
  {
    path: 'youtube',
    component: YoutubeComponent  // YouTube music interface
  },
  {
    path: 'auth/callback',
    component: OauthCallbackComponent
  }
];

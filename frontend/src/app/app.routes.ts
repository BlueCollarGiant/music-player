import { Routes } from '@angular/router';
import { OauthCallbackComponent } from './oauth-callback/oauth-callback.component';
import { LandingComponent } from './music-player/main/landing/landing.component';
import { MainBodyComponent } from './music-player/main/main-body/main-body.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'player',
    component: MainBodyComponent
  },
  {
    path: 'auth/callback',
    component: OauthCallbackComponent
  }
];

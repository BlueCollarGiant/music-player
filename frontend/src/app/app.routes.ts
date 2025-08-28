import { Routes } from '@angular/router';
import { OauthCallbackComponent } from './features/oauth/oauth-callback.component';
import { LandingComponent } from './features/music-player/main/landing/landing.component';
import { PlatformShellComponent } from './features/music-player/components/platform-shell/platform-shell.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'landing', component: LandingComponent },

  {
    path: 'platform/:platform', // dynamic param
    component: PlatformShellComponent,
  },

  { path: 'auth/callback', component: OauthCallbackComponent },
  { path: '**', redirectTo: '' },
];

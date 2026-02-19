import { Routes } from '@angular/router';
import { OauthCallbackComponent } from './features/oauth/oauth-callback.component';
import { LandingComponent } from './features/music-player/main/landing/landing.component';
import { PlatformShellComponent } from './features/music-player/components/platform-shell/platform-shell.component';
import { LocalLibraryDashboardComponent } from './features/local/components/local-library-dashboard/local-library-dashboard.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'landing', component: LandingComponent },

  // More-specific route must come before the dynamic :platform catch-all
  { path: 'platform/local/library', component: LocalLibraryDashboardComponent },

  {
    path: 'platform/:platform', // dynamic param
    component: PlatformShellComponent,
  },

  { path: 'auth/callback', component: OauthCallbackComponent },
  { path: '**', redirectTo: '' },
];

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';

import { AuthInterceptor } from './core/auth/auth.interceptor';
import { provideYouTubeAdapter } from './features/music-player/adapters/youtube';
import { provideSpotifyAdapter } from './features/music-player/adapters/spotify';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withFetch()),
    ...provideYouTubeAdapter(),
    ...provideSpotifyAdapter(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};

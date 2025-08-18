import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get Bearer token from localStorage
    const token = localStorage.getItem('auth_token');

    // Clone and modify request
    let modifiedReq = req;

    // Set Authorization if available
    if (token && !req.headers.has('Authorization')) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers.set('Authorization', `Bearer ${token}`)
      });
    }

  // Always set JSON content-type; CSRF header and credentials are not used in stateless JWT mode
    modifiedReq = modifiedReq.clone({
      headers: modifiedReq.headers
    .set('Content-Type', 'application/json')
    });

    // Handle response
    return next.handle(modifiedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          localStorage.removeItem('auth_token');
          this.router.navigate(['/']);
        }
        return throwError(() => error);
      })
    );
  }
}
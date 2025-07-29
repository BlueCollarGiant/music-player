import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.css']
})
export class OauthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  message = 'Processing authentication...';

  async ngOnInit() {
    try {
      const params = this.route.snapshot.queryParams;
      
      // Handle authentication token
      if (params['token']) {
        this.message = 'Completing login...';
        await this.authService.handleOAuthCallback(params['token']);
        
        // Check if this was a YouTube connection
        if (params['youtube_connected'] === 'true') {
          this.message = 'YouTube connected successfully! Redirecting...';
        } else {
          this.message = 'Login successful! Redirecting...';
        }
        
        window.dispatchEvent(new Event('openHamburgerMenu'));
        
        // Redirect to previous page or home
        const returnUrl = localStorage.getItem('pre_auth_url') || '/landing';
        localStorage.removeItem('pre_auth_url');
        
        setTimeout(() => {
          this.router.navigate([returnUrl]);
        }, 1000);
      }
      // Handle platform connection (legacy support)
      else if (params['platform'] && params['status'] === 'connected') {
        this.message = `${params['platform']} connected successfully!`;
        
        // Refresh user data to show new platform connection
        await this.authService.refreshUserData();
        
        setTimeout(() => {
          this.router.navigate(['/landing']);
        }, 2000);
      }
      // Handle errors
      else if (params['error']) {
        this.message = `Authentication failed: ${params['error']}`;
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      }
      // No valid parameters
      else {
        this.message = 'Invalid authentication response';
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      this.message = 'Authentication failed. Redirecting...';
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    }
  }
}

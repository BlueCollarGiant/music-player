import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  template: `
    <div class="oauth-callback-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .loading-spinner {
      text-align: center;
      color: white;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 4px solid white;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    p {
      font-size: 18px;
      margin: 0;
    }
  `]
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
        this.message = 'Success! Redirecting...';
        
        // Redirect to previous page or home
        const returnUrl = localStorage.getItem('pre_auth_url') || '/';
        localStorage.removeItem('pre_auth_url');
        
        setTimeout(() => {
          this.router.navigate([returnUrl]);
        }, 1000);
      }
      // Handle platform connection
      else if (params['platform'] && params['status'] === 'connected') {
        this.message = `${params['platform']} connected successfully!`;
        
        // Refresh user data to show new platform connection
        await this.authService.refreshUserData();
        
        setTimeout(() => {
          this.router.navigate(['/']);
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

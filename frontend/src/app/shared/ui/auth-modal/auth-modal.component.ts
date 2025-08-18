import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ isLoginMode() ? 'Login' : 'Create Account' }}</h2>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        
        <form class="auth-form" (ngSubmit)="onSubmit()" #authForm="ngForm">
          @if (!isLoginMode()) {
            <div class="form-group">
              <label for="username">Username</label>
              <input 
                type="text" 
                id="username" 
                name="username"
                [(ngModel)]="username" 
                required 
                placeholder="Enter your username"
                autocomplete="username">
            </div>
          }
          
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              [(ngModel)]="email" 
              required 
              placeholder="Enter your email"
              autocomplete="email">
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              [(ngModel)]="password" 
              required 
              placeholder="Enter your password"
              autocomplete="current-password">
          </div>
          
          @if (errorMessage()) {
            <div class="error-message">{{ errorMessage() }}</div>
          }
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="submit-btn"
              [disabled]="authService.loading() || !authForm.valid">
              @if (authService.loading()) {
                <span class="loading-spinner"></span>
                {{ isLoginMode() ? 'Logging in...' : 'Creating Account...' }}
              } @else {
                {{ isLoginMode() ? 'Login' : 'Create Account' }}
              }
            </button>
          </div>
        </form>
        
        <div class="form-footer">
          <p>
            {{ isLoginMode() ? 'Don\'t have an account?' : 'Already have an account?' }}
            <button type="button" class="link-btn" (click)="toggleMode()">
              {{ isLoginMode() ? 'Create Account' : 'Login' }}
            </button>
          </p>
          
          <div class="divider">
            <span>or</span>
          </div>
          
          <button type="button" class="google-btn" (click)="loginWithGoogle()">
            <span class="google-icon">🔑</span>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: linear-gradient(135deg, #1a2142 0%, #0f1631 100%);
      border-radius: 1rem;
      padding: 2rem;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .modal-header h2 {
      color: white;
      margin: 0;
      font-size: 1.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: #ccc;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
    }

    .close-btn:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      color: #e5e7eb;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .form-group input {
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem;
      padding: 0.75rem;
      color: white;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .form-group input::placeholder {
      color: #9ca3af;
    }

    .error-message {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }

    .form-actions {
      margin-top: 1rem;
    }

    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.875rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-footer {
      margin-top: 1.5rem;
      text-align: center;
    }

    .form-footer p {
      color: #9ca3af;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .link-btn {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      text-decoration: underline;
      font-size: 0.875rem;
    }

    .link-btn:hover {
      color: #60a5fa;
    }

    .divider {
      position: relative;
      margin: 1rem 0;
      text-align: center;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background-color: rgba(255, 255, 255, 0.2);
    }

    .divider span {
      background: linear-gradient(135deg, #1a2142 0%, #0f1631 100%);
      color: #9ca3af;
      padding: 0 1rem;
      font-size: 0.875rem;
    }

    .google-btn {
      width: 100%;
      background: linear-gradient(135deg, #ea4335 0%, #4285f4 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .google-btn:hover {
      background: linear-gradient(135deg, #d33b2c 0%, #3367d6 100%);
      transform: translateY(-1px);
    }

    .google-icon {
      font-size: 1rem;
    }
  `]
})
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();
  
  public authService = inject(AuthService);
  
  // Form state
  isLoginMode = signal(true);
  email = '';
  password = '';
  username = '';
  errorMessage = signal('');

  toggleMode() {
    this.isLoginMode.update(value => !value);
    this.errorMessage.set('');
  }

  closeModal() {
    this.close.emit();
  }

  async onSubmit() {
    try {
      this.errorMessage.set('');
      
      if (this.isLoginMode()) {
        await this.authService.loginWithEmail(this.email, this.password);
      } else {
        await this.authService.signupWithEmail(this.email, this.password, this.username);
      }
      
      this.closeModal();
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Authentication failed');
    }
  }

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }
}

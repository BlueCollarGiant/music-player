import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  email: string;
  role: string;
  oauth_provider?: string;
  locked_at?: string;
  failed_attempts: number;
  unlock_token?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website_url?: string;
  birth_date?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformConnection {
  id: number;
  user_id: number;
  platform: string;
  platform_user_id: string;
  platform_username?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  connected_at: string;
  last_synced_at?: string;
  supports_refresh: boolean;
  long_lived_token: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  user_profile?: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  //-----Dependency Injection-----//
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  //-----Properties & Signals-----//
  public isMobileMenuOpen = signal(false);
  public currentUser = signal<User | null>(null);
  private userProfile = signal<UserProfile | null>(null);
  private platformConnections = signal<PlatformConnection[]>([]);
  private isLoading = signal(false);

  //-----Computed Properties-----//
  public user = computed(() => this.currentUser());
  public profile = computed(() => this.userProfile());
  public connections = computed(() => this.platformConnections());
  public isAuthenticated = computed(() => !!this.currentUser());
  public isAdmin = computed(() => this.currentUser()?.is_admin || false);
  public loading = computed(() => this.isLoading());
  public username = computed(() => this.userProfile()?.username || this.currentUser()?.email?.split('@')[0] || 'User');
  public avatarUrl = computed(() => this.userProfile()?.avatar_url);
  public connectedPlatformNames = computed(() => this.platformConnections().map(conn => conn.platform));

  //-----Constructor-----//
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuthState();
    }
  }

  // Initialize authentication state from stored token
  private async initializeAuthState(): Promise<void> {
    const token = this.getStoredToken();
    if (token) {
      try {
        await this.validateAndLoadUser(token);
      } catch (error) {
        this.clearAuthState();
      }
    }
  }

  // Validate token and load user data
  private async validateAndLoadUser(token: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Get current user from a simple endpoint that just validates the token
      const userResponse = await fetch(`${environment.apiUrl}/api/current_user`, {
        headers: this.getAuthHeaders(token),
      });

      if (!userResponse.ok) {
        // If endpoint doesn't exist, try getting user profile directly
        await this.loadUserProfile(token);
        await this.loadPlatformConnections(token);
        
        // If we got here, token is valid, create a basic user object
        this.currentUser.set({
          id: 0, // Will be populated from profile
          email: 'user@example.com', // Will be updated when we add user endpoint
          role: 'user',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          failed_attempts: 0
        });
      } else {
        const userData = await userResponse.json();
        this.currentUser.set(userData.user);

        // Load user profile and platform connections
        await Promise.all([
          this.loadUserProfile(token),
          this.loadPlatformConnections(token)
        ]);
      }

    } catch (error) {
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  // Load user profile
  private async loadUserProfile(token?: string): Promise<void> {
    const authToken = token || this.getStoredToken();
    if (!authToken) return;

    try {
      // First get the current user to find their ID
      const userResponse = await fetch(`${environment.apiUrl}/api/current_user`, {
        headers: this.getAuthHeaders(authToken),
        
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const userId = userData.user.id;

        // Now get the user's profile using their ID
        const profileResponse = await fetch(`${environment.apiUrl}/user_profiles/${userId}`, {
          headers: this.getAuthHeaders(authToken),
          
        });

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          this.userProfile.set(data.user_profile);
        }
      }
    } catch (error) {
      // Silent fail for profile loading
    }
  }

  // Load platform connections
  private async loadPlatformConnections(token?: string): Promise<void> {
    const authToken = token || this.getStoredToken();
    if (!authToken) {
      console.warn('[AuthService] loadPlatformConnections: No auth token available');
      return;
    }

    try {
      console.log('[AuthService] Loading platform connections from:', `${environment.apiUrl}/user_profiles/platform_connections`);
      const response = await fetch(`${environment.apiUrl}/user_profiles/platform_connections`, {
        headers: this.getAuthHeaders(authToken),

      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthService] Platform connections loaded:', data.platform_connections);
        this.platformConnections.set(data.platform_connections || []);
        console.log('[AuthService] Connected platforms:', this.connectedPlatformNames());
      } else {
        console.error('[AuthService] Failed to load platform connections. Status:', response.status);
        const errorText = await response.text();
        console.error('[AuthService] Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load platform connections:', error);
    }
  }

  //-----Public OAuth Methods-----//
  public loginWithGoogle(): void {
    // Save current URL for redirect after authentication
    if (isPlatformBrowser(this.platformId)) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      localStorage.setItem('pre_auth_url', currentPath || '/landing');
    }
    window.location.href = `${environment.apiUrl}/auth/google_oauth2`;
  }

  // Manual Authentication Methods (for users without Gmail)
  public async loginWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await fetch(`${environment.apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
        
      });

      if (response.ok) {
        const data = await response.json();
        this.storeToken(data.token);
        await this.validateAndLoadUser(data.token);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  public async signupWithEmail(email: string, password: string, username?: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const response = await fetch(`${environment.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            email: email,
            password: password,
            password_confirmation: password
          },
          user_profile: {
            username: username || email.split('@')[0]
          }
        }),
        
      });

      if (response.ok) {
        const data = await response.json();
        this.storeToken(data.token);
        await this.validateAndLoadUser(data.token);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.errors?.join(', ') || 'Signup failed');
      }
    } catch (error) {
      console.error('Email signup failed:', error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  // Handle OAuth callback (call this when user returns from OAuth)
  public async handleOAuthCallback(token: string): Promise<void> {
  if (token) {
    this.storeToken(token);
    await this.validateAndLoadUser(token);

    // Force refresh platform connections after OAuth callback
    await this.loadPlatformConnections(token);

    // Check if user has YouTube access through their Google OAuth
    await this.checkYouTubeAccess(token);
  }
}

  // Check if user's Google OAuth includes YouTube access
  private async checkYouTubeAccess(token: string): Promise<void> {
    try {
      // Check if the user's Google OAuth token has YouTube scope
      const response = await fetch(`${environment.apiUrl}/api/youtube/check_access`, {
        headers: this.getAuthHeaders(token),
        
      });

      if (response.ok) {
        const data = await response.json();
        if (data.has_youtube_access) {
          
          // Refresh platform connections to include YouTube
          await this.loadPlatformConnections(token);
        }
      }
    } catch (error) {
      console.log('ℹ️ YouTube access check failed (this is normal if not implemented):', error);
    }
  }

  //-----Public Platform Methods-----//
  public toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  public isPlatformConnected(platform: string): boolean {
    return this.connectedPlatformNames().includes(platform);
  }

  // Disconnect platform
  public async disconnectPlatform(platform: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) return;

    try {
      const connection = this.platformConnections().find(conn => conn.platform === platform);
      if (!connection) {
        console.warn(`No ${platform} connection found to disconnect`);
        return;
      }

      let response;
      
      // Use specific endpoints for each platform
      switch (platform.toLowerCase()) {
        case 'youtube':
          response = await fetch(`${environment.apiUrl}/user_profiles/youtube_connection`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            
          });
          break;
        case 'spotify':
          response = await fetch(`${environment.apiUrl}/user_profiles/spotify_connection`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            
          });
          break;
        
          
        default:
          console.error(`Unknown platform: ${platform}`);
          return;
      }

      if (response && response.ok) {
        // Remove from local state
        this.platformConnections.update(connections => 
          connections.filter(conn => conn.platform !== platform)
        );
      } else if (response) {
        const responseText = await response.text();
        
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || `Failed to disconnect from ${platform}`;
        } catch {
          errorMessage = `Failed to disconnect from ${platform}. Status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
      throw error;
    }
  }

  // Logout
  public async logout(): Promise<void> {
    const token = this.getStoredToken();

    try {
      if (token) {
        await fetch(`${environment.apiUrl}/logout`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(token),
          
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearAuthState();
      this.router.navigate(['/']);
    }
  }

  //-----Public Profile Methods-----//
  public async updateProfile(profileData: Partial<UserProfile>): Promise<void> {
    const token = this.getStoredToken();
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${environment.apiUrl}/user_profiles/update`, {
        method: 'PATCH',
        headers: {
          ...this.getAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_profile: profileData }),
        
      });

      if (response.ok) {
        const data = await response.json();
        this.userProfile.set(data.user_profile);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  //-----Public Admin Methods-----//
  public async getUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }

    const token = this.getStoredToken();
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${environment.apiUrl}/admin/users`, {
        headers: this.getAuthHeaders(token),
        
      });

      if (response.ok) {
        const data = await response.json();
        return data.users;
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  //-----Private Helper Methods-----//
  private getStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('auth_token');
  }

  private storeToken(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem('auth_token', token);
  }

  private getAuthHeaders(token?: string): HeadersInit {
    const authToken = token || this.getStoredToken();
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  private clearAuthState(): void {
    this.currentUser.set(null);
    this.userProfile.set(null);
    this.platformConnections.set([]);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
    }
  }

  // Refresh user data
  public async refreshUserData(): Promise<void> {
    const token = this.getStoredToken();
    if (token) {
      await this.validateAndLoadUser(token);
    }
  }
}

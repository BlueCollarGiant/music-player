# OAuth Integration Guide

## Overview
This music player application now includes a complete OAuth integration system for music platform connections. The testing components have been removed, leaving only production-ready integration code.

## Available OAuth Endpoints

### User Authentication (Google OAuth)
- **Login**: `GET /auth/google_oauth2`
- **Callback**: `GET /auth/google_oauth2/callback`
- **Logout**: `DELETE /logout`

### Platform Connections (Music Services)
- **Connect YouTube**: `GET /auth/youtube`
- **Connect Spotify**: `GET /auth/spotify` (ready to implement)
- **Connect SoundCloud**: `GET /auth/soundcloud` (ready to implement)
- **List Connections**: `GET /user_profiles/platform_connections`
- **Unlink Platform**: `DELETE /user_profiles/platform_connections/:platform`

## Integration Flow

### 1. User Authentication
```javascript
// Login with Google
window.location.href = '/auth/google_oauth2';

// Response includes JWT token
{
  "message": "Google OAuth login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "oauth_provider": "google_oauth2"
  },
  "user_profile": {
    "id": 1,
    "username": "user123"
  }
}
```

### 2. Platform Connection
```javascript
// Connect YouTube (user must be authenticated first)
window.location.href = '/auth/youtube';

// Response confirms connection
{
  "message": "YouTube platform connected successfully",
  "platform_connection": {
    "id": 1,
    "platform": "youtube",
    "connected_at": "2025-07-22T21:17:22.206Z",
    "expires_at": "2025-07-22T22:17:19.000Z",
    "supports_refresh": false,
    "long_lived_token": false
  }
}
```

### 3. Managing Connections
```javascript
// List user's platform connections
fetch('/user_profiles/platform_connections', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Unlink a platform
fetch('/user_profiles/platform_connections/youtube', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Database Models

### User Model
- Supports both manual registration and OAuth
- `oauth_user?` method to check if user signed up via OAuth
- Flexible password requirements (nullable for OAuth users)

### PlatformConnection Model
- Stores access tokens and refresh tokens for music platforms
- Platform enum: `youtube`, `spotify`, `soundcloud`
- Automatic token expiration handling
- Methods: `supports_refresh?`, `long_lived_token?`

## Environment Configuration

Required environment variables in `.env`:
```
# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# YouTube OAuth (for music platform integration)
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret

# Spotify OAuth (for music platform integration)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# SoundCloud OAuth (for music platform integration)
SOUNDCLOUD_CLIENT_ID=your-soundcloud-client-id
SOUNDCLOUD_CLIENT_SECRET=your-soundcloud-client-secret
```

## Frontend Integration

Your Angular frontend can now:

1. **Handle OAuth Login**: Redirect to `/auth/google_oauth2` and capture the returned JWT token
2. **Manage Platform Connections**: Use the platform connection endpoints to connect/disconnect music services
3. **Access Music Data**: Use the stored platform tokens to fetch playlists and music data from connected services
4. **User Session Management**: Use JWT tokens for authenticated API requests

## Next Steps for Music Integration

1. **Create Music Service Classes**: Build service classes to interact with YouTube, Spotify, and SoundCloud APIs using the stored tokens
2. **Playlist Aggregation**: Create endpoints to fetch and combine playlists from all connected platforms
3. **Music Playbook Features**: Build features to create custom playlists mixing songs from different platforms
4. **Token Refresh**: Implement automatic token refresh for platforms that support it

## Security Features

- JWT-based authentication
- Secure token storage in database
- CORS configuration for frontend integration
- Session-based OAuth flow management
- Platform connection isolation (users can connect/disconnect platforms independently)

The OAuth system is now production-ready and integrated into your existing user authentication system!

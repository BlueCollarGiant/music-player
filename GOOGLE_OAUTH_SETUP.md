# Google OAuth Setup Guide

## Backend Environment Variables

Create a `.env` file in your `backend/` directory with the following variables:

```bash
# Copy from .env.example and fill in your values

# Base URL for the application
BASE_URL=http://localhost:3000

# Database configuration
DATABASE_URL=postgresql://your-username:your-password@localhost/your_database_name

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# YouTube OAuth (for music platform integration)
YOUTUBE_CLIENT_ID=your-youtube-client-id-here
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret-here

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:4200
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google+ API (for user authentication)
   - YouTube Data API v3 (for YouTube integration)

4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set up OAuth consent screen first if prompted
6. For OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google_oauth2/callback`
     - `http://localhost:3000/auth/youtube/callback`

7. Copy the Client ID and Client Secret to your `.env` file

## Testing Your Setup

1. Start your Rails backend: `cd backend && rails server`
2. Start your Angular frontend: `cd frontend && ng serve`
3. Visit `http://localhost:4200`
4. Try the "Login with Google" button in the hamburger menu

## Troubleshooting

- Make sure your redirect URIs in Google Cloud Console match exactly
- Check that all environment variables are set correctly
- Verify that the Google+ API and YouTube Data API are enabled
- Check the Rails logs for any OAuth errors

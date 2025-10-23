# Music Player Backend - Node.js

This is a Node.js/Express backend for the Music Player application, migrated from the original Ruby on Rails backend.

## Features

- **User Authentication**
  - Email/password registration and login
  - OAuth2 authentication (Google, YouTube, Spotify)
  - JWT token-based authentication
  - Account locking after failed login attempts
  - Password reset functionality

- **Music Platform Integration**
  - YouTube Music integration
  - Spotify integration
  - Fetch playlists and tracks from connected platforms
  - Automatic token refresh

- **User Profiles**
  - Username management
  - Avatar uploads
  - Username/avatar change history tracking

- **Admin Dashboard**
  - User management
  - User search and filtering
  - Promote/demote admin roles

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Passport.js + JWT
- **File Uploads**: Multer
- **API Integrations**: Google APIs, Spotify Web API

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   - Database credentials
   - JWT secrets
   - OAuth credentials (Google, YouTube, Spotify)
   - Frontend URL for CORS

3. **Create database**
   ```bash
   # Using PostgreSQL CLI
   createdb music_player_development
   ```

4. **Run migrations**
   ```bash
   npm run migrate
   ```

## Running the Application

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start server with nodemon (auto-reload)
- `npm run migrate` - Run database migrations

## Project Structure

```
nodebackend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database connection
│   │   ├── index.js      # Main config
│   │   └── passport.js   # OAuth strategies
│   ├── controllers/      # Request handlers
│   │   ├── api/platforms/
│   │   └── ...
│   ├── models/           # Sequelize models
│   ├── routes/           # Route definitions
│   ├── services/         # Business logic
│   │   ├── platforms/    # Platform-specific services
│   │   └── JsonWebToken.js
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   ├── database/         # Migration scripts
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── public/
│   └── avatars/          # User avatar uploads
├── logs/                 # Application logs
├── .env.example          # Environment template
└── package.json
```

## API Endpoints

### Authentication
- `POST /login` - Email/password login
- `DELETE /logout` - Logout
- `POST /users` - Register new user
- `GET /api/current_user` - Get current authenticated user

### OAuth
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/youtube` - Connect YouTube Music
- `GET /auth/youtube/callback` - YouTube OAuth callback
- `GET /auth/spotify` - Connect Spotify
- `GET /auth/spotify/callback` - Spotify OAuth callback

### User Profiles
- `GET /user_profiles/current` - Get current user profile
- `PATCH /user_profiles/:id` - Update username
- `POST /user_profiles/:id/upload_avatar` - Upload avatar
- `GET /user_profiles/:id/username_history` - Username change history

### Platforms
- `GET /api/platforms/:platform/playlists` - Get playlists (YouTube/Spotify)
- `GET /api/platforms/:platform/playlists/:id/tracks` - Get playlist tracks
- `GET /api/platforms/:platform/check_access` - Check platform connection

### Admin (Admin only)
- `GET /admin/dashboard` - Admin dashboard stats
- `GET /admin/users` - List users with pagination
- `GET /admin/users/search?q=query` - Search users
- `POST /admin/users/:id/promote` - Make user admin
- `POST /admin/users/:id/demote` - Remove admin role

## Database Models

- **User** - User accounts with authentication
- **UserProfile** - User profile information
- **PlatformConnection** - OAuth connections to music platforms
- **PasswordReset** - Password reset tokens
- **UserNameChangeLog** - Username change history
- **UserAvatar** - Avatar change history

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` or individual `DB_*` variables
- `JWT_SECRET` - Secret key for JWT tokens
- `SESSION_SECRET` - Secret key for sessions
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `FRONTEND_URL` - Frontend application URL

## Migration Status

### ✅ Completed
- Database models and associations
- User authentication (email/password)
- JWT token management
- OAuth strategies setup
- Basic route structure
- Error handling middleware
- CORS and session configuration

### 🚧 In Progress
- User profile controllers (avatars, username updates)
- Platform integration services (Spotify, YouTube)
- Password reset flow
- Admin controllers
- File upload handling

### 📋 Pending
- Complete platform API implementations
- Email sending for password resets
- Additional admin features
- Comprehensive testing

## License

ISC

# Quick Start Guide - Node.js Backend

Get the Node.js backend up and running in minutes!

---

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 12+ installed and running
- [ ] npm installed (`npm --version`)
- [ ] Git installed (for cloning)

---

## Step 1: Install Dependencies

```bash
cd nodebackend
npm install
```

Expected output: ~243 packages installed

---

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

**Edit `.env` with your settings:**

```env
# Minimum required configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=music_player_dev
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:4200
```

**To generate secure secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 3: Create Database

```bash
# Using PostgreSQL command line
createdb music_player_dev

# Or using psql:
psql -U postgres
CREATE DATABASE music_player_dev;
\q
```

---

## Step 4: Run Migrations

```bash
npm run migrate
```

Expected output:
```
Starting database migration...
Database connection established.
Database migration completed successfully!
```

This creates all necessary tables:
- users
- user_profiles
- platform_connections
- password_resets
- user_name_change_logs
- user_avatars

---

## Step 5: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

Expected output:
```
Server is running on port 3000
Environment: development
Base URL: http://localhost:3000
Frontend URL: http://localhost:4200
```

---

## Step 6: Test the Server

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T...",
  "environment": "development"
}
```

### Test User Registration

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "username": "testuser"
  }'
```

Expected response:
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Authenticated Endpoint

```bash
# Use the token from registration/login response
curl http://localhost:3000/api/current_user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Optional: OAuth Setup

To enable OAuth login (Google, YouTube, Spotify):

### 1. Get OAuth Credentials

**Google/YouTube:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:3000/auth/youtube/callback`

**Spotify:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI:
   - `http://localhost:3000/auth/spotify/callback`

### 2. Update .env

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# YouTube OAuth
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret

# Spotify OAuth
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### 3. Restart Server

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### 4. Test OAuth

Visit in browser:
- Google: `http://localhost:3000/auth/google`
- YouTube: `http://localhost:3000/auth/youtube`
- Spotify: `http://localhost:3000/auth/spotify`

---

## Troubleshooting

### Database Connection Error

**Error:** `Connection refused`

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Test connection: `psql -U your_user -d music_player_dev`

### Port Already In Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port 3000
# On Linux/Mac:
lsof -i :3000

# On Windows:
netstat -ano | findstr :3000

# Kill the process or change PORT in .env
```

### Module Not Found

**Error:** `Cannot find module 'xxx'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Migration Fails

**Error:** Database migration errors

**Solution:**
```bash
# Drop and recreate database
dropdb music_player_dev
createdb music_player_dev
npm run migrate
```

---

## Next Steps

1. **Connect Frontend:** Update frontend to point to `http://localhost:3000`
2. **Create Admin User:** Register a user and manually update role in database
3. **Configure OAuth:** Set up OAuth providers for full functionality
4. **Review API:** Check [README.md](./README.md) for complete API documentation

---

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start

# Run migrations
npm run migrate

# View logs
tail -f logs/app.log
```

---

## File Locations

- **Configuration:** `.env`
- **Logs:** `logs/`
- **Uploads:** `public/avatars/`
- **Database config:** `src/config/database.js`
- **Main server:** `src/server.js`

---

## Default Ports

- **Backend API:** 3000
- **Frontend:** 4200 (Angular)
- **PostgreSQL:** 5432

---

## Getting Help

- Check [README.md](./README.md) for detailed documentation
- Review [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) for implementation status
- See [RAILS_TO_NODE_MAPPING.md](./RAILS_TO_NODE_MAPPING.md) for code comparisons

---

**You're all set! The backend should now be running on http://localhost:3000** 🚀

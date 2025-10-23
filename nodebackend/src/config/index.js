import dotenv from 'dotenv';

dotenv.config();

const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiration: process.env.JWT_EXPIRATION || '24h'
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
    optionsSuccessStatus: 200
  },

  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    youtube: {
      clientID: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      callbackURL: process.env.YOUTUBE_CALLBACK_URL || 'http://localhost:3000/auth/youtube/callback',
      scope: ['https://www.googleapis.com/auth/youtube.readonly']
    },
    spotify: {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.SPOTIFY_CALLBACK_URL || 'http://localhost:3000/auth/spotify/callback',
      scope: ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative']
    },
    soundcloud: {
      clientID: process.env.SOUNDCLOUD_CLIENT_ID,
      clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
      callbackURL: process.env.SOUNDCLOUD_CALLBACK_URL || 'http://localhost:3000/auth/soundcloud/callback'
    }
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
    uploadPath: process.env.UPLOAD_PATH || './public/avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg']
  }
};

export default config;

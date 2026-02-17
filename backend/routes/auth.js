const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const PlatformConnection = require('../models/PlatformConnection');
const { encode } = require('../services/jwt');
const authenticate = require('../middleware/auth');

const frontendBaseUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:4200';
};

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(401).json({ errors: ['Invalid email or password'] });
    }

    if (user.isLocked) {
      return res.status(403).json({ errors: ['Account is locked. Please reset your password.'] });
    }

    const isValid = await user.authenticate(password);
    if (isValid) {
      user.failedLoginAttempts = 0;
      await user.save();
      const token = encode({ user_id: user._id });
      return res.json({
        message: 'Logged in successfully',
        user: { id: user._id, email: user.email },
        token
      });
    } else {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 3) {
        user.isLocked = true;
        await user.save();
        return res.status(403).json({
          errors: ['Account locked after too many failed attempts. Please reset your password.']
        });
      }
      await user.save();
      return res.status(401).json({ errors: ['Invalid email or password'] });
    }
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// DELETE /logout
router.delete('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET/POST /auth/google_oauth2 — initiate Google OAuth
const googleAuthMiddleware = passport.authenticate('google', {
  scope: ['email', 'profile'],
  prompt: 'select_account',
  accessType: 'online'
});
router.get('/auth/google_oauth2', googleAuthMiddleware);
router.post('/auth/google_oauth2', googleAuthMiddleware);

// GET /auth/google_oauth2/callback
router.get('/auth/google_oauth2/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const { user } = req.user;
      const token = encode({ user_id: user._id });
      res.redirect(`${frontendBaseUrl()}/landing?token=${token}`);
    } catch (err) {
      console.error('Google OAuth callback error:', err.message);
      res.redirect(`${frontendBaseUrl()}/landing?error=server_error`);
    }
  }
);

// GET/POST /auth/youtube — initiate YouTube OAuth
const youtubeAuthMiddleware = passport.authenticate('youtube', {
  scope: ['email', 'profile', 'https://www.googleapis.com/auth/youtube.readonly'],
  accessType: 'offline',
  prompt: 'select_account'
});
router.get('/auth/youtube', youtubeAuthMiddleware);
router.post('/auth/youtube', youtubeAuthMiddleware);

// GET /auth/youtube/callback
router.get('/auth/youtube/callback',
  passport.authenticate('youtube', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const { user, accessToken, refreshToken, params } = req.user;
      const token = encode({ user_id: user._id });

      // Store/update YouTube platform connection
      const expiresAt = params && params.expires_in
        ? new Date(Date.now() + params.expires_in * 1000)
        : null;

      await PlatformConnection.findOneAndUpdate(
        { userId: user._id, platform: 'youtube' },
        {
          platformUserId: user.uid || user._id.toString(),
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt,
          connectedAt: new Date(),
          scopes: 'email profile https://www.googleapis.com/auth/youtube.readonly'
        },
        { upsert: true, new: true }
      );

      res.redirect(`${frontendBaseUrl()}/landing?token=${token}&youtube_connected=true`);
    } catch (err) {
      console.error('YouTube OAuth callback error:', err.message);
      res.redirect(`${frontendBaseUrl()}/landing?error=server_error`);
    }
  }
);

// GET/POST /auth/spotify — initiate Spotify OAuth
const spotifyAuthMiddleware = passport.authenticate('spotify', {
  scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative',
  showDialog: false
});
router.get('/auth/spotify', spotifyAuthMiddleware);
router.post('/auth/spotify', spotifyAuthMiddleware);

// GET /auth/spotify/callback
router.get('/auth/spotify/callback',
  passport.authenticate('spotify', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const { user, accessToken, refreshToken, expires_in } = req.user;
      const token = encode({ user_id: user._id });

      const expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : null;

      // Find existing connection to preserve connectedAt
      const existing = await PlatformConnection.findOne({ userId: user._id, platform: 'spotify' });

      await PlatformConnection.findOneAndUpdate(
        { userId: user._id, platform: 'spotify' },
        {
          platformUserId: user.uid || user._id.toString(),
          accessToken,
          refreshToken: refreshToken || (existing && existing.refreshToken) || undefined,
          expiresAt,
          connectedAt: (existing && existing.connectedAt) || new Date(),
          scopes: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative'
        },
        { upsert: true, new: true }
      );

      res.redirect(`${frontendBaseUrl()}/landing?token=${token}&platform=spotify&status=success`);
    } catch (err) {
      console.error('Spotify OAuth callback error:', err.message);
      res.redirect(`${frontendBaseUrl()}/landing?error=server_error`);
    }
  }
);

// GET /auth/failure
router.get('/auth/failure', (req, res) => {
  const errorMsg = req.query.message || 'unknown_error';
  console.error('OAuth failure:', errorMsg);
  res.redirect(`${frontendBaseUrl()}/landing?error=oauth_failure&details=${errorMsg}`);
});

module.exports = router;

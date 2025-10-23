import express from 'express';
import passport from 'passport';
import SessionsController from '../controllers/SessionsController.js';

const router = express.Router();

// Login and logout
router.post('/login', SessionsController.create);
router.delete('/logout', SessionsController.destroy);

// OAuth routes
// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  SessionsController.omniauth
);

// YouTube OAuth
router.get('/youtube',
  passport.authenticate('youtube', {
    scope: ['https://www.googleapis.com/auth/youtube.readonly']
  })
);
router.get('/youtube/callback',
  passport.authenticate('youtube', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  SessionsController.omniauth
);

// Spotify OAuth
router.get('/spotify',
  passport.authenticate('spotify', {
    scope: ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative']
  })
);
router.get('/spotify/callback',
  passport.authenticate('spotify', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  SessionsController.omniauth
);

// OAuth failure
router.get('/failure', SessionsController.failure);

export default router;

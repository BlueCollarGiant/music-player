const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth2 (for user login)
passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google_oauth2/callback',
  scope: ['email', 'profile'],
  prompt: 'select_account'
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const user = await User.fromOmniauth(profile, 'google_oauth2', { accessToken, refreshToken, params });
    done(null, { user, accessToken, refreshToken, params, provider: 'google_oauth2' });
  } catch (err) {
    done(err, null);
  }
}));

// YouTube (Google OAuth2 with YouTube scopes)
passport.use('youtube', new GoogleStrategy({
  clientID: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  callbackURL: '/auth/youtube/callback',
  scope: ['email', 'profile', 'https://www.googleapis.com/auth/youtube.readonly'],
  accessType: 'offline',
  prompt: 'select_account'
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const user = await User.fromOmniauth(profile, 'youtube', { accessToken, refreshToken, params });
    done(null, { user, accessToken, refreshToken, params, provider: 'youtube' });
  } catch (err) {
    done(err, null);
  }
}));

// Spotify OAuth
passport.use('spotify', new SpotifyStrategy({
  clientID: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  callbackURL: process.env.SPOTIFY_REDIRECT_URI || '/auth/spotify/callback',
  scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative'
}, async (accessToken, refreshToken, expires_in, profile, done) => {
  try {
    const user = await User.fromOmniauth(profile, 'spotify', { accessToken, refreshToken, expires_in });
    done(null, { user, accessToken, refreshToken, expires_in, provider: 'spotify' });
  } catch (err) {
    done(err, null);
  }
}));

module.exports = passport;

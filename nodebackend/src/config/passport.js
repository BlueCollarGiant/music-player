import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import config from './index.js';
import { User, PlatformConnection } from '../models/index.js';
import { sequelize } from './database.js';

// Serialize user for session (not used much with JWT, but needed for passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      include: ['profile', 'platformConnections']
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (for user authentication)
if (config.oauth.google.clientID && config.oauth.google.clientSecret) {
  passport.use('google', new GoogleStrategy({
    clientID: config.oauth.google.clientID,
    clientSecret: config.oauth.google.clientSecret,
    callbackURL: config.oauth.google.callbackURL,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    const transaction = await sequelize.transaction();

    try {
      const authData = {
        email: profile.emails[0].value,
        provider: 'google',
        uid: profile.id,
        name: profile.displayName
      };

      const user = await User.findOrCreateFromOAuth(authData, transaction);

      await transaction.commit();

      return done(null, user, { provider: 'google' });
    } catch (error) {
      await transaction.rollback();
      return done(error, null);
    }
  }));
}

// YouTube OAuth Strategy (for platform connection)
if (config.oauth.youtube.clientID && config.oauth.youtube.clientSecret) {
  passport.use('youtube', new GoogleStrategy({
    clientID: config.oauth.youtube.clientID,
    clientSecret: config.oauth.youtube.clientSecret,
    callbackURL: config.oauth.youtube.callbackURL,
    scope: config.oauth.youtube.scope,
    accessType: 'offline',
    prompt: 'consent',
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, params, profile, done) => {
    const transaction = await sequelize.transaction();

    try {
      const authData = {
        email: profile.emails[0].value,
        provider: 'google',
        uid: profile.id,
        name: profile.displayName
      };

      const user = await User.findOrCreateFromOAuth(authData, transaction);

      // Store YouTube connection
      const expiresAt = params.expires_in
        ? new Date(Date.now() + params.expires_in * 1000)
        : null;

      const [connection] = await PlatformConnection.findOrCreate({
        where: { userId: user.id, platform: 'youtube' },
        defaults: {
          platformUserId: profile.id,
          accessToken,
          refreshToken,
          expiresAt,
          connectedAt: new Date(),
          scope: params.scope || config.oauth.youtube.scope.join(' ')
        },
        transaction
      });

      if (!connection.isNewRecord) {
        await connection.update({
          accessToken,
          refreshToken: refreshToken || connection.refreshToken,
          expiresAt,
          scope: params.scope || config.oauth.youtube.scope.join(' ')
        }, { transaction });
      }

      await transaction.commit();

      return done(null, user, { provider: 'youtube' });
    } catch (error) {
      await transaction.rollback();
      return done(error, null);
    }
  }));
}

// Spotify OAuth Strategy
if (config.oauth.spotify.clientID && config.oauth.spotify.clientSecret) {
  passport.use('spotify', new SpotifyStrategy({
    clientID: config.oauth.spotify.clientID,
    clientSecret: config.oauth.spotify.clientSecret,
    callbackURL: config.oauth.spotify.callbackURL,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, expires_in, profile, done) => {
    const transaction = await sequelize.transaction();

    try {
      const authData = {
        email: profile.emails[0].value,
        provider: 'spotify',
        uid: profile.id,
        name: profile.displayName
      };

      const user = await User.findOrCreateFromOAuth(authData, transaction);

      // Store Spotify connection
      const expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : null;

      const [connection] = await PlatformConnection.findOrCreate({
        where: { userId: user.id, platform: 'spotify' },
        defaults: {
          platformUserId: profile.id,
          accessToken,
          refreshToken,
          expiresAt,
          connectedAt: new Date(),
          scope: config.oauth.spotify.scope.join(' ')
        },
        transaction
      });

      if (!connection.isNewRecord) {
        await connection.update({
          accessToken,
          refreshToken: refreshToken || connection.refreshToken,
          expiresAt
        }, { transaction });
      }

      await transaction.commit();

      return done(null, user, { provider: 'spotify' });
    } catch (error) {
      await transaction.rollback();
      return done(error, null);
    }
  }));
}

export default passport;

import { User, UserProfile, PlatformConnection } from '../models/index.js';
import JsonWebToken from '../services/JsonWebToken.js';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

class SessionsController {
  // POST /login
  static async create(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const user = await User.findOne({
        where: { email },
        include: ['profile']
      });

      if (!user) {
        return res.status(401).json({
          errors: ['Invalid email or password']
        });
      }

      // Check if account is locked
      if (!user.isActive()) {
        return res.status(403).json({
          errors: ['Account is locked. Please try again later or reset your password.']
        });
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);

      if (isValidPassword) {
        // Reset failed attempts on successful login
        await user.resetFailedAttempts();

        const token = JsonWebToken.encode({ userId: user.id });

        return res.json({
          message: 'Logged in successfully',
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token
        });
      } else {
        // Increment failed attempts
        await user.incrementFailedAttempts();

        if (user.failedLoginAttempts >= 3) {
          return res.status(403).json({
            errors: ['Account locked after too many failed attempts. Please try again later.']
          });
        } else {
          return res.status(401).json({
            errors: ['Invalid email or password']
          });
        }
      }
    } catch (error) {
      next(error);
    }
  }

  // DELETE /logout
  static async destroy(req, res, next) {
    try {
      // In JWT-based auth, logout is handled client-side by removing the token
      // But we can still provide a logout endpoint for consistency
      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // OAuth callback handler
  static async omniauth(req, res, next) {
    try {
      const user = req.user;
      const provider = req.params.provider || req.authInfo?.provider;

      if (!user) {
        return res.redirect(`${config.app.frontendUrl}/landing?error=auth_failed`);
      }

      const token = JsonWebToken.encode({ userId: user.id });

      // Build redirect URL based on provider
      let redirectUrl = `${config.app.frontendUrl}/landing?token=${token}`;

      if (provider === 'youtube') {
        redirectUrl += '&youtube_connected=true';
      } else if (provider === 'spotify') {
        redirectUrl += '&platform=spotify&status=success';
      }

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${config.app.frontendUrl}/landing?error=server_error`);
    }
  }

  // OAuth failure handler
  static async failure(req, res) {
    res.redirect(`${config.app.frontendUrl}/landing?error=auth_failed`);
  }
}

export default SessionsController;

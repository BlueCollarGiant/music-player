import JsonWebToken from '../services/JsonWebToken.js';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    const { valid, payload, error } = JsonWebToken.verify(token);

    if (!valid) {
      return res.status(401).json({ error: error || 'Invalid token' });
    }

    // Load user from database
    const user = await User.findByPk(payload.userId, {
      include: ['profile', 'platformConnections']
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive()) {
      return res.status(403).json({ error: 'Account is locked. Please try again later.' });
    }

    req.currentUser = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.currentUser.isAdmin()) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const { valid, payload } = JsonWebToken.verify(token);

    if (valid && payload.userId) {
      const user = await User.findByPk(payload.userId, {
        include: ['profile', 'platformConnections']
      });

      if (user) {
        req.currentUser = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

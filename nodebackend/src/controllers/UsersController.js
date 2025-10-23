import { User, UserProfile } from '../models/index.js';
import JsonWebToken from '../services/JsonWebToken.js';
import { AppError } from '../middleware/errorHandler.js';
import { sequelize } from '../config/database.js';

class UsersController {
  // GET /api/current_user
  static async current(req, res, next) {
    try {
      const user = req.currentUser;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          oauth_provider: user.provider,
          is_admin: user.isAdmin(),
          created_at: user.createdAt,
          updated_at: user.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id
  static async show(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (req.currentUser.id !== userId) {
        throw new AppError('Access denied', 403);
      }

      res.json({
        id: req.currentUser.id,
        email: req.currentUser.email
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /users
  static async create(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
      const { email, password, password_confirmation, username } = req.body;

      // Validation
      if (!email || !password) {
        throw new AppError('Email and password are required', 422);
      }

      if (password !== password_confirmation) {
        throw new AppError('Password confirmation does not match', 422);
      }

      if (password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 422);
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new AppError('Email already exists', 422);
      }

      // Create user
      const user = await User.create({
        email,
        role: 'user'
      }, { transaction });

      // Set password
      await user.setPassword(password);
      await user.save({ transaction });

      // Create user profile
      const profileUsername = username || email.split('@')[0] || `user_${Date.now()}`;
      const profile = await UserProfile.create({
        userId: user.id,
        username: profileUsername.replace(/[^a-zA-Z0-9_]/g, '_')
      }, { transaction });

      await transaction.commit();

      const token = JsonWebToken.encode({ userId: user.id });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
}

export default UsersController;

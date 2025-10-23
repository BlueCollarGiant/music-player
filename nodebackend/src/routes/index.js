import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import userProfileRoutes from './userProfiles.js';
import platformRoutes from './platforms.js';
import passwordResetRoutes from './passwordResets.js';
import adminRoutes from './admin.js';

const router = express.Router();

// Auth routes (login, logout, OAuth callbacks)
router.use('/auth', authRoutes);
router.use('/', authRoutes); // For login/logout at root level

// User routes
router.use('/users', userRoutes);

// User profile routes
router.use('/user_profiles', userProfileRoutes);

// Platform routes (unified API)
router.use('/api/platforms', platformRoutes);

// Password reset routes
router.use('/password_resets', passwordResetRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// API current user route
router.get('/api/current_user', async (req, res, next) => {
  try {
    const { authenticate } = await import('../middleware/auth.js');
    authenticate(req, res, async () => {
      res.json({
        user: req.currentUser,
        profile: req.currentUser.profile
      });
    });
  } catch (error) {
    next(error);
  }
});

export default router;

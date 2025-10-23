import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Placeholder - will implement full functionality
router.get('/dashboard', async (req, res) => {
  res.json({ message: 'Admin dashboard endpoint - to be implemented' });
});

export default router;

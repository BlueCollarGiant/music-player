import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Placeholder - will implement full functionality
router.get('/current', authenticate, async (req, res) => {
  res.json({ message: 'User profiles endpoint - to be implemented' });
});

export default router;

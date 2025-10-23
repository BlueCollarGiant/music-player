import express from 'express';
import UsersController from '../controllers/UsersController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /users - Register new user
router.post('/', UsersController.create);

// GET /users/:id - Get user by ID (authenticated)
router.get('/:id', authenticate, UsersController.show);

export default router;

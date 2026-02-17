const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { encode } = require('../services/jwt');
const authenticate = require('../middleware/auth');

// POST /users (Register)
router.post('/users', async (req, res) => {
  try {
    const { email, password, password_confirmation } = req.body.user || req.body;
    const username = (req.body.user_profile && req.body.user_profile.username)
      || req.body.username
      || (req.body.user && req.body.user.username);

    if (!email || !password) {
      return res.status(422).json({ errors: ['Email and password are required'] });
    }

    if (password !== password_confirmation && password_confirmation !== undefined) {
      return res.status(422).json({ errors: ["Password confirmation doesn't match"] });
    }

    if (password.length < 6) {
      return res.status(422).json({ errors: ['Password must be at least 6 characters'] });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(422).json({ errors: ['Email has already been taken'] });
    }

    // Check for existing username
    if (username) {
      const existingUsername = await User.findOne({ 'profile.username': username });
      if (existingUsername) {
        return res.status(422).json({ errors: ['Username has already been taken'] });
      }
    }

    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'user',
      profile: {
        username: username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
      }
    });

    await user.save();
    const token = encode({ user_id: user._id });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    if (err.code === 11000) {
      return res.status(422).json({ errors: ['Email or username has already been taken'] });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(422).json({ errors: messages });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /users/:id
router.get('/users/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only self or admin
    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied', message: 'You can only access your own resources' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        oauth_provider: user.provider,
        is_admin: user.isAdmin,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/current_user
router.get('/api/current_user', authenticate, async (req, res) => {
  const user = req.currentUser;
  res.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      oauth_provider: user.provider,
      is_admin: user.isAdmin,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  });
});

module.exports = router;

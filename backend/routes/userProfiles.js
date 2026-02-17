const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const User = require('../models/User');
const PlatformConnection = require('../models/PlatformConnection');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

// Multer config for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.currentUser._id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Avatar must be a JPEG or PNG'));
    }
  }
});

function avatarUrl(user) {
  if (user.profile && user.profile.avatarUrl) {
    return user.profile.avatarUrl;
  }
  return `${process.env.BASE_URL || 'http://localhost:3000'}/assets/avatars/default-avatar.png`;
}

function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

function sanitizedLimit(query, defaultLimit = 25, maxLimit = 100) {
  const requested = parseInt(query.limit) || defaultLimit;
  if (requested <= 0) return defaultLimit;
  return Math.min(requested, maxLimit);
}

// Collection routes MUST be defined before :id routes

// GET /user_profiles/current
router.get('/current', authenticate, async (req, res) => {
  const user = req.currentUser;
  if (!user.profile) {
    return res.status(404).json({ errors: ['Profile not found'] });
  }
  res.json({
    id: user._id,
    username: user.profile.username,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    avatar_url: avatarUrl(user),
    user: { id: user._id, email: user.email }
  });
});

// GET /user_profiles/youtube_connection
router.get('/youtube_connection', authenticate, async (req, res) => {
  const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'youtube' });
  if (connection) {
    res.json({
      youtube_connection: {
        id: connection._id,
        connected_at: connection.connectedAt,
        expires_at: connection.expiresAt,
        is_active: connection.active,
        supports_refresh: connection.supportsRefresh
      }
    });
  } else {
    res.json({ youtube_connection: null, message: 'No YouTube connection found' });
  }
});

// DELETE /user_profiles/youtube_connection
router.delete('/youtube_connection', authenticate, async (req, res) => {
  const result = await PlatformConnection.findOneAndDelete({ userId: req.currentUser._id, platform: 'youtube' });
  if (result) {
    res.json({ message: 'YouTube connection removed successfully' });
  } else {
    res.status(404).json({ error: 'No YouTube connection found' });
  }
});

// GET /user_profiles/spotify_connection
router.get('/spotify_connection', authenticate, async (req, res) => {
  const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'spotify' });
  if (connection) {
    res.json({
      spotify_connection: {
        id: connection._id,
        connected_at: connection.connectedAt,
        expires_at: connection.expiresAt,
        is_active: !connection.expiresAt || connection.expiresAt > new Date(),
        supports_refresh: connection.supportsRefresh
      }
    });
  } else {
    res.json({ spotify_connection: null, message: 'No Spotify connection found' });
  }
});

// DELETE /user_profiles/spotify_connection
router.delete('/spotify_connection', authenticate, async (req, res) => {
  const result = await PlatformConnection.findOneAndDelete({ userId: req.currentUser._id, platform: 'spotify' });
  if (result) {
    res.json({ message: 'Spotify connection removed successfully' });
  } else {
    res.status(404).json({ error: 'No Spotify connection found' });
  }
});

// GET /user_profiles/platform_connections
router.get('/platform_connections', authenticate, async (req, res) => {
  const connections = await PlatformConnection.find({ userId: req.currentUser._id });
  const formatted = connections.map(c => ({
    id: c._id,
    platform: c.platform,
    platform_user_id: c.platformUserId,
    connected_at: c.connectedAt,
    expires_at: c.expiresAt,
    is_active: !c.expiresAt || c.expiresAt > new Date(),
    scopes: c.scopes
  }));
  res.json({ platform_connections: formatted });
});

// GET /user_profiles/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    // Authorize: self or admin
    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied', message: 'You can only access your own resources' });
    }

    res.json({
      id: user._id,
      username: user.profile.username,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      avatar_url: avatarUrl(user),
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ errors: ['Profile not found'] });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PATCH /user_profiles/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { username } = req.body.user_profile || req.body;
    if (username && username !== user.profile.username) {
      // Check uniqueness
      const existing = await User.findOne({ 'profile.username': username, _id: { $ne: user._id } });
      if (existing) {
        return res.status(422).json({ errors: ['Username has already been taken'] });
      }

      // Log username change
      user.profile.nameChangeLogs.push({
        oldUsername: user.profile.username,
        currentUsername: username,
        changeDate: new Date()
      });
      user.profile.username = username;
    }

    await user.save();
    res.json({
      id: user._id,
      username: user.profile.username,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      avatar_url: avatarUrl(user)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(422).json({ errors: messages });
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// DELETE /user_profiles/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    user.profile = undefined;
    await user.save();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /user_profiles/:id/username_history
router.get('/:id/username_history', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const limit = sanitizedLimit(req.query);
    const logs = user.profile.nameChangeLogs
      .sort((a, b) => b.changeDate - a.changeDate)
      .slice(0, limit);

    const formatted = logs.map(log => ({
      id: log._id,
      old_username: log.oldUsername,
      current_username: log.currentUsername,
      change_date: log.changeDate,
      formatted_date: formatDate(log.changeDate)
    }));

    res.json({
      user_id: user._id,
      username: user.profile.username,
      total_changes: formatted.length,
      limit_applied: limit,
      changes: formatted
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /user_profiles/:id/upload_avatar
router.post('/:id/upload_avatar', authenticate, upload.single('user_profile[avatar]'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    if (req.currentUser._id.toString() !== user._id.toString() && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      // Also try the field name 'avatar'
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    const url = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
    user.profile.avatarUrl = url;
    user.profile.avatarHistory.push({
      currentAvatar: req.file.filename,
      changeDate: new Date()
    });
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: url
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Also accept 'avatar' as field name for upload
router.post('/:id/upload_avatar', authenticate, upload.single('avatar'), async (req, res) => {
  // This is handled by the route above since Express matches first
});

// GET /user_profiles/:id/avatar_history (Admin only)
router.get('/:id/avatar_history', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile) {
      return res.status(404).json({ errors: ['Profile not found'] });
    }

    const limit = sanitizedLimit(req.query);
    const history = user.profile.avatarHistory
      .sort((a, b) => b.changeDate - a.changeDate)
      .slice(0, limit);

    const formatted = history.map(log => ({
      id: log._id,
      current_avatar: log.currentAvatar,
      change_date: log.changeDate,
      formatted_date: formatDate(log.changeDate)
    }));

    res.json({
      user_id: user._id,
      username: user.profile.username,
      total_changes: formatted.length,
      limit_applied: limit,
      changes: formatted
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

function formatUserData(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    created_at: user.createdAt,
    formatted_created_at: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }) : null,
    username: user.profile ? user.profile.username : null,
    profile_id: user._id, // In MongoDB, profile is embedded so we use user ID
    username_changes_count: user.profile ? user.profile.nameChangeLogs.length : 0,
    provider: user.provider
  };
}

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProfiles = await User.countDocuments({ 'profile.username': { $exists: true } });

    // Count total username changes across all users
    const usernameChangesAgg = await User.aggregate([
      { $unwind: '$profile.nameChangeLogs' },
      { $count: 'total' }
    ]);
    const totalUsernameChanges = usernameChangesAgg[0] ? usernameChangesAgg[0].total : 0;

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent username changes
    const recentChangesAgg = await User.aggregate([
      { $unwind: '$profile.nameChangeLogs' },
      { $sort: { 'profile.nameChangeLogs.changeDate': -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: '$profile.nameChangeLogs._id',
          old_username: '$profile.nameChangeLogs.oldUsername',
          current_username: '$profile.nameChangeLogs.currentUsername',
          change_date: '$profile.nameChangeLogs.changeDate',
          user_email: '$email'
        }
      }
    ]);

    const recentUsernameChanges = recentChangesAgg.map(log => ({
      id: log._id,
      old_username: log.old_username,
      current_username: log.current_username,
      change_date: log.change_date,
      formatted_date: new Date(log.change_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      }),
      user_email: log.user_email
    }));

    // Role breakdown
    const roleBreakdownAgg = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const userRoleBreakdown = {};
    for (const entry of roleBreakdownAgg) {
      userRoleBreakdown[entry._id] = entry.count;
    }

    res.json({
      total_users: totalUsers,
      total_profiles: totalProfiles,
      total_username_changes: totalUsernameChanges,
      recent_users: recentUsers.map(formatUserData),
      recent_username_changes: recentUsernameChanges,
      user_role_breakdown: userRoleBreakdown
    });
  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.status(500).json({ error: 'Unable to load dashboard data' });
  }
});

// GET /admin/users
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.per_page) || 25, 1), 100);
    const skip = (page - 1) * perPage;

    const totalCount = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    res.json({
      users: users.map(formatUserData),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / perPage),
        total_count: totalCount,
        per_page: perPage
      }
    });
  } catch (err) {
    console.error('Admin users list error:', err.message);
    res.status(500).json({ error: 'Unable to load users' });
  }
});

// GET /admin/users/search
router.get('/users/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      $or: [
        { email: regex },
        { 'profile.username': regex }
      ]
    }).limit(50);

    res.json({
      query,
      results: users.map(formatUserData),
      count: users.length
    });
  } catch (err) {
    console.error('Admin user search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /admin/users/:id/promote
router.post('/users/:id/promote', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(422).json({ error: 'User is already an admin' });
    }

    user.role = 'admin';
    await user.save();

    console.log(`Admin ${req.currentUser.email} promoted user ${user.email} to admin`);
    res.json({ message: 'User promoted to admin', user: formatUserData(user) });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// POST /admin/users/:id/demote
router.post('/users/:id/demote', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user._id.toString() === req.currentUser._id.toString()) {
      return res.status(403).json({ error: 'Cannot demote yourself' });
    }

    if (user.role === 'user') {
      return res.status(422).json({ error: 'User is already a regular user' });
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(403).json({ error: 'Cannot demote the last admin' });
    }

    user.role = 'user';
    await user.save();

    console.log(`Admin ${req.currentUser.email} demoted user ${user.email} to regular user`);
    res.json({ message: 'User demoted to regular user', user: formatUserData(user) });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

module.exports = router;

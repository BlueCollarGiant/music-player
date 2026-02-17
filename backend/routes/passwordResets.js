const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

// POST /password_resets
router.post('/', async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'Password reset instructions sent if email exists.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await PasswordReset.create({
      userId: user._id,
      resetToken: token,
      expiresAt
    });

    console.log(`RESET EMAIL to ${user.email}:`);
    console.log(`Use this reset link (FAKE): http://localhost:3000/password_resets/${token}/edit`);

    res.json({ message: 'Password reset instructions sent if email exists.' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

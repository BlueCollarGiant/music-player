const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const nameChangeLogSchema = new mongoose.Schema({
  oldUsername: { type: String, required: true },
  currentUsername: { type: String, required: true },
  changeDate: { type: Date, required: true, default: Date.now }
}, { _id: true });

const avatarHistorySchema = new mongoose.Schema({
  currentAvatar: { type: String, required: true },
  changeDate: { type: Date, required: true, default: Date.now }
}, { _id: true });

const userProfileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 30,
    validate: {
      validator: v => USERNAME_PATTERN.test(v),
      message: 'Username can only contain letters, numbers, and underscores'
    }
  },
  avatarUrl: { type: String, default: null },
  nameChangeLogs: [nameChangeLogSchema],
  avatarHistory: [avatarHistorySchema]
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  provider: { type: String, default: null },
  uid: { type: String, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  profile: userProfileSchema
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for unique username (sparse — only if profile exists)
userSchema.index({ 'profile.username': 1 }, {
  unique: true,
  partialFilterExpression: { 'profile.username': { $exists: true } }
});

// Virtuals
userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

userSchema.virtual('oauthUser').get(function () {
  return !!(this.provider && this.uid);
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

// Instance methods
userSchema.methods.authenticate = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.youtubeConnection = async function () {
  const PlatformConnection = mongoose.model('PlatformConnection');
  return PlatformConnection.findOne({ userId: this._id, platform: 'youtube' });
};

userSchema.methods.spotifyConnection = async function () {
  const PlatformConnection = mongoose.model('PlatformConnection');
  return PlatformConnection.findOne({ userId: this._id, platform: 'spotify' });
};

// Static: from OAuth
userSchema.statics.fromOmniauth = async function (profile, provider, credentials) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  if (!email) return null;

  let user = await this.findOne({ email });
  if (user) {
    if (!user.provider || !user.uid) {
      user.provider = provider;
      user.uid = profile.id;
      await user.save();
    }
  } else {
    let username = profile.displayName || email.split('@')[0] || `user_${Math.random().toString(36).slice(2, 10)}`;
    username = username.replace(/[^a-zA-Z0-9_\s]/g, '_').trim().replace(/\s+/g, '_');
    if (username.length < 3) username = `user_${username}`;

    // Ensure unique username
    const existing = await this.findOne({ 'profile.username': username });
    if (existing) {
      username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
    }

    user = await this.create({
      email,
      provider,
      uid: profile.id,
      role: 'user',
      profile: { username }
    });
  }

  // Update profile username if it starts with user_ and we have a display name
  if (user.profile && user.profile.username.startsWith('user_') && profile.displayName) {
    let newName = profile.displayName.replace(/[^a-zA-Z0-9_\s]/g, '_').trim().replace(/\s+/g, '_');
    if (newName.length >= 3) {
      const exists = await this.findOne({ 'profile.username': newName, _id: { $ne: user._id } });
      if (!exists) {
        user.profile.username = newName;
        await user.save();
      }
    }
  }

  return user;
};

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const SUPPORTED_PLATFORMS = ['youtube', 'spotify'];

const platformConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: {
    type: String,
    required: true,
    enum: SUPPORTED_PLATFORMS
  },
  platformUserId: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  scopes: { type: String, default: null },
  connectedAt: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true
});

// Compound unique index: one connection per user per platform
platformConnectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

platformConnectionSchema.virtual('expired').get(function () {
  return this.expiresAt && this.expiresAt <= new Date();
});

platformConnectionSchema.virtual('active').get(function () {
  return !this.expired;
});

platformConnectionSchema.virtual('supportsRefresh').get(function () {
  return !!this.refreshToken && SUPPORTED_PLATFORMS.includes(this.platform);
});

platformConnectionSchema.methods.tokenExpired = function () {
  return this.expiresAt && this.expiresAt <= new Date();
};

platformConnectionSchema.statics.SUPPORTED_PLATFORMS = SUPPORTED_PLATFORMS;

module.exports = mongoose.model('PlatformConnection', platformConnectionSchema);

import bcrypt from 'bcryptjs';

export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    passwordDigest: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'password_digest'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
      allowNull: false,
      validate: {
        isIn: [['user', 'admin']]
      }
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_login_attempts'
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (!user.role) {
          user.role = 'user';
        }
      }
    }
  });

  // Instance methods
  User.prototype.setPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    this.passwordDigest = await bcrypt.hash(password, salt);
  };

  User.prototype.validatePassword = async function(password) {
    if (!this.passwordDigest) return false;
    return await bcrypt.compare(password, this.passwordDigest);
  };

  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };

  User.prototype.isActive = function() {
    // Account locking after 3 failed attempts
    if (this.lockedAt && this.failedLoginAttempts >= 3) {
      const lockDuration = 30 * 60 * 1000; // 30 minutes
      const timeSinceLock = Date.now() - new Date(this.lockedAt).getTime();
      return timeSinceLock > lockDuration;
    }
    return true;
  };

  User.prototype.isOAuthUser = function() {
    return this.provider && this.uid;
  };

  User.prototype.incrementFailedAttempts = async function() {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 3) {
      this.lockedAt = new Date();
    }
    await this.save();
  };

  User.prototype.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.lockedAt = null;
    await this.save();
  };

  User.prototype.getYoutubeConnection = async function() {
    const { PlatformConnection } = sequelize.models;
    return await PlatformConnection.findOne({
      where: { userId: this.id, platform: 'youtube' }
    });
  };

  User.prototype.getSpotifyConnection = async function() {
    const { PlatformConnection } = sequelize.models;
    return await PlatformConnection.findOne({
      where: { userId: this.id, platform: 'spotify' }
    });
  };

  User.prototype.getSoundcloudConnection = async function() {
    const { PlatformConnection } = sequelize.models;
    return await PlatformConnection.findOne({
      where: { userId: this.id, platform: 'soundcloud' }
    });
  };

  // Static methods
  User.findOrCreateFromOAuth = async function(authData, transaction = null) {
    const options = transaction ? { transaction } : {};

    // Try to find existing user by email
    let user = await User.findOne({
      where: { email: authData.email },
      ...options
    });

    if (user) {
      // Update OAuth data if user exists but doesn't have it
      if (!user.provider || !user.uid) {
        user.provider = authData.provider;
        user.uid = authData.uid;
        await user.save(options);
      }
    } else {
      // Create new user from OAuth
      user = await User.create({
        email: authData.email,
        provider: authData.provider,
        uid: authData.uid,
        role: 'user'
      }, options);
    }

    // Ensure user profile exists
    const { UserProfile } = sequelize.models;
    let profile = await UserProfile.findOne({
      where: { userId: user.id },
      ...options
    });

    if (!profile) {
      const username = authData.name || authData.email.split('@')[0] || `user_${Date.now()}`;
      profile = await UserProfile.create({
        userId: user.id,
        username: username.replace(/[^a-zA-Z0-9_\s]/g, '_').trim()
      }, options);
    } else if (profile.username.startsWith('user_') && authData.name) {
      // Update generic username with real name from OAuth
      profile.username = authData.name;
      await profile.save(options);
    }

    return user;
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.passwordDigest;
    delete values.failedLoginAttempts;
    delete values.lockedAt;
    return values;
  };

  return User;
};

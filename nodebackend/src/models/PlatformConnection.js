export default (sequelize, DataTypes) => {
  const PlatformConnection = sequelize.define('PlatformConnection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['youtube', 'spotify', 'soundcloud']]
      }
    },
    platformUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'platform_user_id'
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    connectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'connected_at'
    },
    tokenType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'token_type'
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'platform_connections',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'platform']
      }
    ]
  });

  // Instance methods
  PlatformConnection.prototype.isExpired = function() {
    // Only consider expired if expiresAt is explicitly set and in the past
    return this.expiresAt && new Date(this.expiresAt) <= new Date();
  };

  PlatformConnection.prototype.isActive = function() {
    // Token is active if no expiration or expiration is in future
    return !this.isExpired();
  };

  PlatformConnection.prototype.supportsRefresh = function() {
    // Spotify and YouTube both support refresh tokens
    const refreshablePlatforms = ['youtube', 'spotify'];
    return this.refreshToken && refreshablePlatforms.includes(this.platform);
  };

  PlatformConnection.prototype.isLongLivedToken = function() {
    // Some platforms like SoundCloud provide tokens without expiration
    return !this.expiresAt;
  };

  PlatformConnection.prototype.needsRefresh = function(bufferSeconds = 60) {
    // Check if token needs refresh (within buffer time of expiry)
    if (!this.expiresAt) return false;

    const expiryTime = new Date(this.expiresAt).getTime();
    const bufferTime = bufferSeconds * 1000;
    const currentTime = Date.now();

    return (expiryTime - currentTime) <= bufferTime;
  };

  PlatformConnection.prototype.updateTokens = async function(tokenData) {
    this.accessToken = tokenData.accessToken;
    if (tokenData.refreshToken) {
      this.refreshToken = tokenData.refreshToken;
    }
    if (tokenData.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);
      this.expiresAt = expiresAt;
    }
    if (tokenData.tokenType) {
      this.tokenType = tokenData.tokenType;
    }
    if (tokenData.scope) {
      this.scope = tokenData.scope;
    }

    await this.save();
  };

  PlatformConnection.prototype.toJSON = function() {
    const values = { ...this.get() };
    // Don't expose tokens in JSON responses
    delete values.accessToken;
    delete values.refreshToken;
    return values;
  };

  // Static scopes
  PlatformConnection.active = function() {
    return this.findAll({
      where: sequelize.literal('expires_at IS NULL OR expires_at > NOW()')
    });
  };

  PlatformConnection.expired = function() {
    return this.findAll({
      where: sequelize.literal('expires_at IS NOT NULL AND expires_at <= NOW()')
    });
  };

  PlatformConnection.byPlatform = function(platform) {
    return this.findAll({
      where: { platform }
    });
  };

  PlatformConnection.withRefreshToken = function() {
    return this.findAll({
      where: {
        refreshToken: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });
  };

  return PlatformConnection;
};

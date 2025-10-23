import crypto from 'crypto';

export default (sequelize, DataTypes) => {
  const PasswordReset = sequelize.define('PasswordReset', {
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
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at'
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
    tableName: 'password_resets',
    timestamps: true,
    underscored: true
  });

  // Static methods
  PasswordReset.createToken = async function(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour expiry

    return await this.create({
      userId,
      token,
      expiresAt
    });
  };

  // Instance methods
  PasswordReset.prototype.isExpired = function() {
    return new Date() > new Date(this.expiresAt);
  };

  PasswordReset.prototype.isUsed = function() {
    return this.usedAt !== null;
  };

  PasswordReset.prototype.isValid = function() {
    return !this.isExpired() && !this.isUsed();
  };

  PasswordReset.prototype.markAsUsed = async function() {
    this.usedAt = new Date();
    await this.save();
  };

  return PasswordReset;
};

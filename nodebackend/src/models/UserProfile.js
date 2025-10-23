export default (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 30],
        isValidUsername(value) {
          const usernamePattern = /^[a-zA-Z0-9_]+$/;
          if (!usernamePattern.test(value)) {
            throw new Error('Username can only contain letters, numbers, and underscores');
          }
        }
      }
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'avatar_url'
    },
    avatarFilename: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'avatar_filename'
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
    tableName: 'user_profiles',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeUpdate: async (profile, options) => {
        // Log username change
        if (profile.changed('username')) {
          const { UserNameChangeLog } = sequelize.models;
          const oldUsername = profile._previousDataValues.username;

          if (oldUsername) {
            await UserNameChangeLog.create({
              userProfileId: profile.id,
              oldUsername: oldUsername,
              currentUsername: profile.username,
              changeDate: new Date()
            }, options);
          }
        }

        // Log avatar change
        if (profile.changed('avatarFilename')) {
          const newFilename = profile.avatarFilename;
          const defaultFilename = 'default-avatar.png';

          // Only log user-initiated avatar changes (not default avatar)
          if (newFilename && newFilename !== defaultFilename) {
            const { UserAvatar } = sequelize.models;
            await UserAvatar.create({
              userProfileId: profile.id,
              currentAvatar: newFilename,
              changeDate: new Date()
            }, options);
          }
        }
      },
      afterCreate: async (profile, options) => {
        // Attach default avatar if no avatar is set
        if (!profile.avatarUrl && !profile.avatarFilename) {
          const defaultFilename = 'default-avatar.png';
          const defaultUrl = `/avatars/${defaultFilename}`;

          profile.avatarUrl = defaultUrl;
          profile.avatarFilename = defaultFilename;
          await profile.save(options);

          // Log default avatar assignment
          const { UserAvatar } = sequelize.models;
          await UserAvatar.create({
            userProfileId: profile.id,
            currentAvatar: defaultFilename,
            changeDate: new Date()
          }, options);
        }
      }
    }
  });

  // Instance methods
  UserProfile.prototype.setAvatar = async function(filename, baseUrl) {
    this.avatarFilename = filename;
    this.avatarUrl = `${baseUrl}/avatars/${filename}`;
    await this.save();
  };

  UserProfile.prototype.hasDefaultAvatar = function() {
    return this.avatarFilename === 'default-avatar.png';
  };

  UserProfile.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
  };

  return UserProfile;
};

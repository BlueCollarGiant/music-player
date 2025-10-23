export default (sequelize, DataTypes) => {
  const UserAvatar = sequelize.define('UserAvatar', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_profile_id',
      references: {
        model: 'user_profiles',
        key: 'id'
      }
    },
    currentAvatar: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'current_avatar'
    },
    changeDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'change_date'
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
    tableName: 'user_avatars',
    timestamps: true,
    underscored: true
  });

  return UserAvatar;
};

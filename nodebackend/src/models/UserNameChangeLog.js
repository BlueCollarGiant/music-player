export default (sequelize, DataTypes) => {
  const UserNameChangeLog = sequelize.define('UserNameChangeLog', {
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
    oldUsername: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'old_username'
    },
    currentUsername: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'current_username'
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
    tableName: 'user_name_change_logs',
    timestamps: true,
    underscored: true
  });

  return UserNameChangeLog;
};

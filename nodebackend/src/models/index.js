import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

// Import models
import UserModel from './User.js';
import UserProfileModel from './UserProfile.js';
import PlatformConnectionModel from './PlatformConnection.js';
import PasswordResetModel from './PasswordReset.js';
import UserNameChangeLogModel from './UserNameChangeLog.js';
import UserAvatarModel from './UserAvatar.js';

// Initialize models
const User = UserModel(sequelize, Sequelize.DataTypes);
const UserProfile = UserProfileModel(sequelize, Sequelize.DataTypes);
const PlatformConnection = PlatformConnectionModel(sequelize, Sequelize.DataTypes);
const PasswordReset = PasswordResetModel(sequelize, Sequelize.DataTypes);
const UserNameChangeLog = UserNameChangeLogModel(sequelize, Sequelize.DataTypes);
const UserAvatar = UserAvatarModel(sequelize, Sequelize.DataTypes);

// Define associations
// User associations
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' });
User.hasMany(PlatformConnection, { foreignKey: 'userId', as: 'platformConnections', onDelete: 'CASCADE' });
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets', onDelete: 'CASCADE' });

// UserProfile associations
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserProfile.hasMany(UserNameChangeLog, { foreignKey: 'userProfileId', as: 'nameChangeLogs', onDelete: 'CASCADE' });
UserProfile.hasMany(UserAvatar, { foreignKey: 'userProfileId', as: 'avatars', onDelete: 'CASCADE' });

// PlatformConnection associations
PlatformConnection.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// PasswordReset associations
PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// UserNameChangeLog associations
UserNameChangeLog.belongsTo(UserProfile, { foreignKey: 'userProfileId', as: 'profile' });

// UserAvatar associations
UserAvatar.belongsTo(UserProfile, { foreignKey: 'userProfileId', as: 'profile' });

const db = {
  sequelize,
  Sequelize,
  User,
  UserProfile,
  PlatformConnection,
  PasswordReset,
  UserNameChangeLog,
  UserAvatar
};

export default db;
export {
  sequelize,
  User,
  UserProfile,
  PlatformConnection,
  PasswordReset,
  UserNameChangeLog,
  UserAvatar
};

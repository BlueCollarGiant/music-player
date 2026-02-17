const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/music_player_development';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding');

    const adminEmail = 'insanemito@gmail.com';
    const adminUsername = 'insanemito';

    const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists for insanemito@gmail.com, skipping creation.');
    } else {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword && process.env.NODE_ENV === 'production') {
        console.error('ADMIN_PASSWORD environment variable is required in production!');
        process.exit(1);
      }

      const password = adminPassword || `temp_${Math.random().toString(36).slice(2, 18)}`;

      let admin = await User.findOne({ email: adminEmail });
      if (admin) {
        admin.role = 'admin';
        admin.passwordHash = password;
        if (admin.profile) {
          admin.profile.username = adminUsername;
        } else {
          admin.profile = { username: adminUsername };
        }
        await admin.save();
      } else {
        admin = new User({
          email: adminEmail,
          passwordHash: password,
          role: 'admin',
          profile: { username: adminUsername }
        });
        await admin.save();
      }

      console.log(`Admin user created or updated: ${admin.email} (username: ${adminUsername})`);
      if (!adminPassword) {
        console.log(`Generated temporary password for development: ${password}`);
      }
    }

    console.log('\nSeeding completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

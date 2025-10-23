import { sequelize } from '../config/database.js';
import db from '../models/index.js';

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync all models
    // alter: true will try to alter existing tables to match models
    // force: true would drop and recreate tables (use with caution!)
    await sequelize.sync({ alter: true });

    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

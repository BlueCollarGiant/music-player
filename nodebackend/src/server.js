import app from './app.js';
import config from './config/index.js';
import { sequelize } from './config/database.js';

const PORT = config.app.port;

// Test database connection
async function startServer() {
  try {
    // Test the database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models (in development only)
    if (config.app.env === 'development') {
      console.log('Syncing database models...');
      // Note: alter: true will update tables without dropping them
      // For production, use migrations instead
      await sequelize.sync({ alter: false });
      console.log('Database models synced.');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${config.app.env}`);
      console.log(`Base URL: ${config.app.baseUrl}`);
      console.log(`Frontend URL: ${config.app.frontendUrl}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

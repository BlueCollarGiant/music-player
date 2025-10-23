import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from './config/passport.js';
import config from './config/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors(config.cors));

// Session configuration
app.use(session(config.session));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Serve static files (avatars, etc.)
app.use('/avatars', express.static('public/avatars'));
app.use('/public', express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.app.env
  });
});

// API routes
app.use('/', routes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;

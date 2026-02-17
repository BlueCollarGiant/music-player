const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./config/db');
const corsOptions = require('./config/cors');
require('./config/passport');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const userProfileRoutes = require('./routes/userProfiles');
const youtubeRoutes = require('./routes/youtube');
const platformRoutes = require('./routes/platforms');
const adminRoutes = require('./routes/admin');
const passwordResetRoutes = require('./routes/passwordResets');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (needed for Passport OAuth flows)
app.use(session({
  secret: process.env.JWT_SECRET || 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Health check
app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/', (req, res) => res.status(200).send('ok'));

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/user_profiles', userProfileRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/admin', adminRoutes);
app.use('/password_resets', passwordResetRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

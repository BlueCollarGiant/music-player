const { decode } = require('../services/jwt');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }

  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : header;
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }

  const decoded = decode(token);
  if (!decoded || !decoded.user_id) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }

  const user = await User.findById(decoded.user_id);
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }

  req.currentUser = user;
  next();
}

module.exports = authenticate;

const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'fallback-secret-key';

function encode(payload, expiresIn = '24h') {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function decode(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}

module.exports = { encode, decode };

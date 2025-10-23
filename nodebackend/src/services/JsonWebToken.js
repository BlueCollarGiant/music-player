import jwt from 'jsonwebtoken';
import config from '../config/index.js';

class JsonWebToken {
  static encode(payload, expiresIn = null) {
    const options = {};

    if (expiresIn) {
      options.expiresIn = expiresIn;
    } else {
      options.expiresIn = config.jwt.expiration;
    }

    return jwt.sign(payload, config.jwt.secret, options);
  }

  static decode(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  static verify(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return { valid: true, payload: decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  static decodeWithoutVerify(token) {
    return jwt.decode(token);
  }
}

export default JsonWebToken;

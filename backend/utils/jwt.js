const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate access and refresh tokens
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken({ id: user._id });

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: user.getPublicProfile()
    });
};

module.exports = {
  generateToken,
  verifyToken,
  generateTokens,
  sendTokenResponse
};


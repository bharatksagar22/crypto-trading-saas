const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update last API call
      req.user.lastApiCall = new Date();
      await req.user.save();

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is approved
const checkApproval = (req, res, next) => {
  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Account pending admin approval'
    });
  }
  next();
};

// Check if user has active subscription
const checkSubscription = (req, res, next) => {
  if (req.user.subscriptionStatus !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Active subscription required'
    });
  }
  
  // Check if subscription has expired
  if (req.user.subscriptionEndDate && new Date() > req.user.subscriptionEndDate) {
    req.user.subscriptionStatus = 'expired';
    req.user.save();
    
    return res.status(403).json({
      success: false,
      message: 'Subscription has expired'
    });
  }
  
  next();
};

module.exports = {
  protect,
  authorize,
  checkApproval,
  checkSubscription
};


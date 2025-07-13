const express = require('express');
const router = express.Router();
const { 
  getDashboard, 
  updateProfile, 
  toggleTrading, 
  updateSettings,
  getSettings 
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// @route   GET /api/user/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', protect, getDashboard);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   POST /api/user/toggle-trading
// @desc    Toggle trading status
// @access  Private
router.post('/toggle-trading', protect, toggleTrading);

// @route   GET /api/user/settings
// @desc    Get user settings
// @access  Private
router.get('/settings', protect, getSettings);

// @route   PUT /api/user/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', protect, updateSettings);

module.exports = router;


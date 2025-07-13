const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateRegister, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   PUT /api/auth/reset-password/:resetToken
// @desc    Reset password
// @access  Public
router.put('/reset-password/:resetToken', resetPassword);

module.exports = router;


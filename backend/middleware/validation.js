const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Delta API keys validation
const validateDeltaKeys = [
  body('apiKey')
    .notEmpty()
    .withMessage('API Key is required'),
  body('apiSecret')
    .notEmpty()
    .withMessage('API Secret is required'),
  handleValidationErrors
];

// Trade validation
const validateTrade = [
  body('symbol')
    .notEmpty()
    .withMessage('Symbol is required'),
  body('side')
    .isIn(['BUY', 'SELL'])
    .withMessage('Side must be BUY or SELL'),
  body('quantity')
    .isFloat({ min: 0.001 })
    .withMessage('Quantity must be a positive number'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  handleValidationErrors
];

// Coupon validation
const validateCoupon = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .isAlphanumeric()
    .withMessage('Coupon code must be 3-20 alphanumeric characters'),
  body('discountPercent')
    .isInt({ min: 1, max: 100 })
    .withMessage('Discount percent must be between 1 and 100'),
  body('maxUses')
    .isInt({ min: 1 })
    .withMessage('Max uses must be at least 1'),
  body('validFrom')
    .isISO8601()
    .withMessage('Valid from must be a valid date'),
  body('validTo')
    .isISO8601()
    .withMessage('Valid to must be a valid date'),
  handleValidationErrors
];

// Risk settings validation
const validateRiskSettings = [
  body('dailyLossCap')
    .isFloat({ min: 100 })
    .withMessage('Daily loss cap must be at least 100'),
  body('maxTradeCountPerDay')
    .isInt({ min: 1, max: 50 })
    .withMessage('Max trade count per day must be between 1 and 50'),
  body('maxTradeSizePercent')
    .isFloat({ min: 1, max: 20 })
    .withMessage('Max trade size percent must be between 1 and 20'),
  body('maxLeverageCap')
    .isFloat({ min: 1, max: 50 })
    .withMessage('Max leverage cap must be between 1 and 50'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateDeltaKeys,
  validateTrade,
  validateCoupon,
  validateRiskSettings,
  handleValidationErrors
};


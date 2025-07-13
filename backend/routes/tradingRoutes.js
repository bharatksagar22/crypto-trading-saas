const express = require('express');
const router = express.Router();
const {
  getTradingConfig,
  updateTradingConfig,
  getTradingStatus,
  startTrading,
  stopTrading,
  emergencyStop,
  resetDailyStats,
  updateCoinConfig,
  getPerformanceMetrics
} = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/trading/config
// @desc    Get user trading configuration
// @access  Private
router.get('/config', getTradingConfig);

// @route   PUT /api/trading/config
// @desc    Update user trading configuration
// @access  Private
router.put('/config', updateTradingConfig);

// @route   GET /api/trading/status
// @desc    Get trading status
// @access  Private
router.get('/status', getTradingStatus);

// @route   POST /api/trading/start
// @desc    Start trading
// @access  Private
router.post('/start', startTrading);

// @route   POST /api/trading/stop
// @desc    Stop trading
// @access  Private
router.post('/stop', stopTrading);

// @route   POST /api/trading/emergency-stop
// @desc    Emergency stop all trading
// @access  Private
router.post('/emergency-stop', emergencyStop);

// @route   POST /api/trading/reset-daily
// @desc    Reset daily stats
// @access  Private
router.post('/reset-daily', resetDailyStats);

// @route   PUT /api/trading/coins/:symbol
// @desc    Update coin configuration
// @access  Private
router.put('/coins/:symbol', updateCoinConfig);

// @route   GET /api/trading/performance
// @desc    Get trading performance metrics
// @access  Private
router.get('/performance', getPerformanceMetrics);

module.exports = router;


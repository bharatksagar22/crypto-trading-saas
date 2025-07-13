const express = require('express');
const router = express.Router();
const {
  getPnLData,
  getStrategyPerformance,
  getCoinPerformance,
  generateReport,
  getUserReports,
  getTradingMetrics,
  sendDailyReportEmail
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// @route   GET /api/reports/pnl
// @desc    Get P&L data
// @access  Private
router.get('/pnl', protect, getPnLData);

// @route   GET /api/reports/strategy-performance
// @desc    Get strategy performance
// @access  Private
router.get('/strategy-performance', protect, getStrategyPerformance);

// @route   GET /api/reports/coin-performance
// @desc    Get coin performance
// @access  Private
router.get('/coin-performance', protect, getCoinPerformance);

// @route   POST /api/reports/generate
// @desc    Generate comprehensive report
// @access  Private
router.post('/generate', protect, generateReport);

// @route   GET /api/reports/list
// @desc    Get user reports
// @access  Private
router.get('/list', protect, getUserReports);

// @route   GET /api/reports/metrics
// @desc    Get trading metrics
// @access  Private
router.get('/metrics', protect, getTradingMetrics);

// @route   POST /api/reports/send-daily
// @desc    Send daily report email
// @access  Private
router.post('/send-daily', protect, sendDailyReportEmail);

module.exports = router;


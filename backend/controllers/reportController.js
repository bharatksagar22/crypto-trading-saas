const Trade = require('../models/Trade');
const User = require('../models/User');
const Report = require('../models/Report');
const Strategy = require('../models/Strategy');
const SystemLog = require('../models/SystemLog');
const { generatePnLChart, generatePerformanceReport } = require('../services/reportService');
const { sendDailyReport } = require('../utils/email');

// @desc    Get user PnL data
// @route   GET /api/reports/pnl
// @access  Private
const getPnLData = async (req, res, next) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregate PnL data
    const aggregationPipeline = [
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalPnL: { $sum: '$pnl' },
          totalTrades: { $sum: 1 },
          winningTrades: {
            $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
          },
          totalVolume: { $sum: { $multiply: ['$quantity', '$executedPrice'] } },
          avgPnL: { $avg: '$pnl' },
          maxPnL: { $max: '$pnl' },
          minPnL: { $min: '$pnl' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const pnlData = await Trade.aggregate(aggregationPipeline);

    // Calculate cumulative PnL
    let cumulativePnL = 0;
    const processedData = pnlData.map(item => {
      cumulativePnL += item.totalPnL;
      return {
        date: item._id,
        dailyPnL: item.totalPnL,
        cumulativePnL,
        trades: item.totalTrades,
        winningTrades: item.winningTrades,
        winRate: item.totalTrades > 0 ? (item.winningTrades / item.totalTrades) * 100 : 0,
        volume: item.totalVolume,
        avgPnL: item.avgPnL,
        maxPnL: item.maxPnL,
        minPnL: item.minPnL
      };
    });

    // Calculate summary statistics
    const totalTrades = pnlData.reduce((sum, item) => sum + item.totalTrades, 0);
    const totalWinningTrades = pnlData.reduce((sum, item) => sum + item.winningTrades, 0);
    const totalPnL = pnlData.reduce((sum, item) => sum + item.totalPnL, 0);
    const totalVolume = pnlData.reduce((sum, item) => sum + item.totalVolume, 0);

    const summary = {
      totalPnL,
      totalTrades,
      winningTrades: totalWinningTrades,
      losingTrades: totalTrades - totalWinningTrades,
      winRate: totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0,
      totalVolume,
      avgDailyPnL: pnlData.length > 0 ? totalPnL / pnlData.length : 0,
      bestDay: Math.max(...pnlData.map(item => item.totalPnL), 0),
      worstDay: Math.min(...pnlData.map(item => item.totalPnL), 0),
      profitableDays: pnlData.filter(item => item.totalPnL > 0).length,
      totalDays: pnlData.length
    };

    res.status(200).json({
      success: true,
      data: {
        pnlData: processedData,
        summary,
        period,
        groupBy
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get strategy performance
// @route   GET /api/reports/strategy-performance
// @access  Private
const getStrategyPerformance = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    // Get strategy performance data
    const strategyPerformance = await Trade.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: '$strategy',
          totalTrades: { $sum: 1 },
          winningTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          totalPnL: { $sum: '$pnl' },
          avgPnL: { $avg: '$pnl' },
          maxPnL: { $max: '$pnl' },
          minPnL: { $min: '$pnl' },
          avgConfidence: { $avg: '$confidenceScore' },
          totalVolume: { $sum: { $multiply: ['$quantity', '$executedPrice'] } }
        }
      },
      { $sort: { totalPnL: -1 } }
    ]);

    // Calculate additional metrics
    const processedStrategies = strategyPerformance.map(strategy => ({
      strategyName: strategy._id,
      totalTrades: strategy.totalTrades,
      winningTrades: strategy.winningTrades,
      losingTrades: strategy.totalTrades - strategy.winningTrades,
      winRate: (strategy.winningTrades / strategy.totalTrades) * 100,
      totalPnL: strategy.totalPnL,
      avgPnL: strategy.avgPnL,
      maxPnL: strategy.maxPnL,
      minPnL: strategy.minPnL,
      avgConfidence: strategy.avgConfidence,
      totalVolume: strategy.totalVolume,
      profitFactor: strategy.winningTrades > 0 && strategy.totalTrades - strategy.winningTrades > 0 
        ? Math.abs(strategy.totalPnL / (strategy.totalTrades - strategy.winningTrades)) : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        strategies: processedStrategies,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get coin performance
// @route   GET /api/reports/coin-performance
// @access  Private
const getCoinPerformance = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    // Get coin performance data
    const coinPerformance = await Trade.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: '$symbol',
          totalTrades: { $sum: 1 },
          winningTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          totalPnL: { $sum: '$pnl' },
          avgPnL: { $avg: '$pnl' },
          totalVolume: { $sum: { $multiply: ['$quantity', '$executedPrice'] } },
          avgHoldingTime: { 
            $avg: { 
              $divide: [
                { $subtract: ['$exitTime', '$entryTime'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        }
      },
      { $sort: { totalPnL: -1 } }
    ]);

    // Process coin data
    const processedCoins = coinPerformance.map(coin => ({
      symbol: coin._id,
      totalTrades: coin.totalTrades,
      winningTrades: coin.winningTrades,
      winRate: (coin.winningTrades / coin.totalTrades) * 100,
      totalPnL: coin.totalPnL,
      avgPnL: coin.avgPnL,
      totalVolume: coin.totalVolume,
      avgHoldingTime: coin.avgHoldingTime || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        coins: processedCoins,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate comprehensive report
// @route   POST /api/reports/generate
// @access  Private
const generateReport = async (req, res, next) => {
  try {
    const { reportType = 'monthly', format = 'pdf' } = req.body;
    
    // Calculate date range based on report type
    const endDate = new Date();
    const startDate = new Date();
    
    switch (reportType) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Generate report data
    const reportData = await generatePerformanceReport(req.user._id, startDate, endDate);
    
    // Create report record
    const report = await Report.create({
      userId: req.user._id,
      reportType,
      reportDate: endDate,
      ...reportData
    });

    // Generate files based on format
    let filePaths = {};
    if (format === 'pdf' || format === 'both') {
      filePaths.pdfPath = await generatePDFReport(report, reportData);
    }
    if (format === 'csv' || format === 'both') {
      filePaths.csvPath = await generateCSVReport(report, reportData);
    }

    // Update report with file paths
    await Report.findByIdAndUpdate(report._id, filePaths);

    // Log report generation
    await SystemLog.log('info', `Report generated: ${reportType}`, 'reports', {
      userId: req.user._id,
      reportId: report._id,
      format
    });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportId: report._id,
        reportType,
        format,
        ...filePaths
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user reports
// @route   GET /api/reports/list
// @access  Private
const getUserReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments({ userId: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trading metrics
// @route   GET /api/reports/metrics
// @access  Private
const getTradingMetrics = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    // Get all trades in period
    const trades = await Trade.find({
      userId: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'FILLED'
    }).sort({ createdAt: 1 });

    if (trades.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          metrics: {},
          message: 'No trades found in the specified period'
        }
      });
    }

    // Calculate metrics
    const metrics = calculateTradingMetrics(trades);

    res.status(200).json({
      success: true,
      data: {
        metrics,
        period,
        totalTrades: trades.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send daily report email
// @route   POST /api/reports/send-daily
// @access  Private
const sendDailyReportEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTrades = await Trade.find({
      userId: req.user._id,
      createdAt: { $gte: today },
      status: 'FILLED'
    });

    const totalPnL = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = todayTrades.filter(trade => trade.pnl > 0).length;
    const winRate = todayTrades.length > 0 ? (winningTrades / todayTrades.length) * 100 : 0;

    // Get top strategies
    const strategyPerformance = {};
    todayTrades.forEach(trade => {
      if (!strategyPerformance[trade.strategy]) {
        strategyPerformance[trade.strategy] = { pnl: 0, trades: 0 };
      }
      strategyPerformance[trade.strategy].pnl += trade.pnl;
      strategyPerformance[trade.strategy].trades += 1;
    });

    const topStrategies = Object.entries(strategyPerformance)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    // Send email
    await sendDailyReport(user, {
      totalPnL,
      totalTrades: todayTrades.length,
      winRate,
      topStrategies
    });

    res.status(200).json({
      success: true,
      message: 'Daily report sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate trading metrics
const calculateTradingMetrics = (trades) => {
  const pnls = trades.map(trade => trade.pnl);
  const winningTrades = trades.filter(trade => trade.pnl > 0);
  const losingTrades = trades.filter(trade => trade.pnl < 0);
  
  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const winRate = (winningTrades.length / trades.length) * 100;
  
  // Calculate Sharpe ratio (simplified)
  const avgReturn = totalPnL / trades.length;
  const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgReturn, 2), 0) / trades.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;
  
  trades.forEach(trade => {
    runningPnL += trade.pnl;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  trades.forEach(trade => {
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    }
  });
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: winRate,
    totalPnL: totalPnL,
    avgPnL: avgReturn,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    sharpeRatio: sharpeRatio,
    maxDrawdown: maxDrawdown,
    maxConsecutiveWins: maxConsecutiveWins,
    maxConsecutiveLosses: maxConsecutiveLosses,
    profitFactor: winningTrades.length > 0 && losingTrades.length > 0 
      ? Math.abs(winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / 
                 losingTrades.reduce((sum, trade) => sum + trade.pnl, 0)) : 0,
    avgWinningTrade: winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length : 0,
    avgLosingTrade: losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length : 0
  };
};

// Helper functions for file generation (simplified)
const generatePDFReport = async (report, data) => {
  // This would generate a PDF file
  // For now, return a placeholder path
  return `/reports/pdf/${report._id}.pdf`;
};

const generateCSVReport = async (report, data) => {
  // This would generate a CSV file
  // For now, return a placeholder path
  return `/reports/csv/${report._id}.csv`;
};

module.exports = {
  getPnLData,
  getStrategyPerformance,
  getCoinPerformance,
  generateReport,
  getUserReports,
  getTradingMetrics,
  sendDailyReportEmail
};


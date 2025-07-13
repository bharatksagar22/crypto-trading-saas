const TradingConfig = require('../models/TradingConfig');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

// @desc    Get user trading configuration
// @route   GET /api/trading/config
// @access  Private
const getTradingConfig = async (req, res) => {
  try {
    let config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      // Create default config for new user
      config = new TradingConfig({
        userId: req.user.id,
        ...TradingConfig.getDefaultConfig()
      });
      await config.save();
    }
    
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting trading config:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user trading configuration
// @route   PUT /api/trading/config
// @access  Private
const updateTradingConfig = async (req, res) => {
  try {
    const {
      dailyLossLimit,
      maxTradeSize,
      riskRewardRatio,
      useTrailingStopLoss,
      trailingStopPercentage,
      useDynamicStopLoss,
      baseStopLossPercentage,
      useConfidenceBasedSizing,
      minConfidenceThreshold,
      coinConfigs,
      enabledStrategies,
      strategyWeights,
      aiToggles,
      tradingHours,
      notifications
    } = req.body;
    
    let config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      config = new TradingConfig({ userId: req.user.id });
    }
    
    // Update fields if provided
    if (dailyLossLimit !== undefined) config.dailyLossLimit = dailyLossLimit;
    if (maxTradeSize !== undefined) config.maxTradeSize = maxTradeSize;
    if (riskRewardRatio !== undefined) config.riskRewardRatio = riskRewardRatio;
    if (useTrailingStopLoss !== undefined) config.useTrailingStopLoss = useTrailingStopLoss;
    if (trailingStopPercentage !== undefined) config.trailingStopPercentage = trailingStopPercentage;
    if (useDynamicStopLoss !== undefined) config.useDynamicStopLoss = useDynamicStopLoss;
    if (baseStopLossPercentage !== undefined) config.baseStopLossPercentage = baseStopLossPercentage;
    if (useConfidenceBasedSizing !== undefined) config.useConfidenceBasedSizing = useConfidenceBasedSizing;
    if (minConfidenceThreshold !== undefined) config.minConfidenceThreshold = minConfidenceThreshold;
    if (coinConfigs !== undefined) config.coinConfigs = coinConfigs;
    if (enabledStrategies !== undefined) config.enabledStrategies = enabledStrategies;
    if (strategyWeights !== undefined) config.strategyWeights = strategyWeights;
    if (aiToggles !== undefined) config.aiToggles = aiToggles;
    if (tradingHours !== undefined) config.tradingHours = tradingHours;
    if (notifications !== undefined) config.notifications = notifications;
    
    await config.save();
    
    res.status(200).json({
      success: true,
      data: config,
      message: 'Trading configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating trading config:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get trading status
// @route   GET /api/trading/status
// @access  Private
const getTradingStatus = async (req, res) => {
  try {
    const config = await TradingConfig.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    // Check if user has API keys configured
    const hasApiKeys = user.deltaApiKey && user.deltaApiSecret;
    
    // Get today's trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTrades = await Trade.find({
      userId: req.user.id,
      createdAt: { $gte: today }
    });
    
    const todayPnL = todayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const todayTradesCount = todayTrades.length;
    const winningTrades = todayTrades.filter(trade => (trade.pnl || 0) > 0).length;
    const todayWinRate = todayTradesCount > 0 ? (winningTrades / todayTradesCount) * 100 : 0;
    
    const status = {
      isConnected: hasApiKeys && config.isActive && !config.emergencyStop,
      isActive: config.isActive,
      emergencyStop: config.emergencyStop,
      emergencyStopReason: config.emergencyStopReason,
      capitalConservationMode: config.capitalConservationMode,
      tradingAllowed: config.isTradingAllowed(),
      dailyStats: {
        pnl: todayPnL,
        tradesCount: todayTradesCount,
        winRate: todayWinRate,
        lossLimitReached: Math.abs(todayPnL) >= config.dailyLossLimit
      },
      apiKeysConfigured: hasApiKeys,
      enabledCoins: config.coinConfigs.filter(coin => coin.enabled).map(coin => coin.symbol),
      enabledStrategies: config.enabledStrategies,
      aiToggles: config.aiToggles
    };
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting trading status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Start trading
// @route   POST /api/trading/start
// @access  Private
const startTrading = async (req, res) => {
  try {
    const config = await TradingConfig.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    // Check if user has API keys
    if (!user.deltaApiKey || !user.deltaApiSecret) {
      return res.status(400).json({
        success: false,
        message: 'Delta API keys not configured'
      });
    }
    
    // Check if trading is allowed
    if (!config.isTradingAllowed()) {
      return res.status(400).json({
        success: false,
        message: 'Trading not allowed. Check emergency stop or daily loss limit.'
      });
    }
    
    // Activate trading
    config.isActive = true;
    config.emergencyStop = false;
    config.emergencyStopReason = '';
    await config.save();
    
    // TODO: Send signal to AI trading engine to start trading
    
    res.status(200).json({
      success: true,
      message: 'Trading started successfully'
    });
  } catch (error) {
    console.error('Error starting trading:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Stop trading
// @route   POST /api/trading/stop
// @access  Private
const stopTrading = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    // Stop trading
    config.isActive = false;
    config.emergencyStop = true;
    config.emergencyStopReason = reason || 'Manual stop by user';
    await config.save();
    
    // TODO: Send signal to AI trading engine to stop trading
    
    res.status(200).json({
      success: true,
      message: 'Trading stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping trading:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Emergency stop all trading
// @route   POST /api/trading/emergency-stop
// @access  Private
const emergencyStop = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    // Emergency stop
    config.isActive = false;
    config.emergencyStop = true;
    config.emergencyStopReason = reason || 'Emergency stop activated';
    config.capitalConservationMode = true;
    await config.save();
    
    // TODO: Send emergency stop signal to AI trading engine
    // TODO: Close all open positions
    
    res.status(200).json({
      success: true,
      message: 'Emergency stop activated'
    });
  } catch (error) {
    console.error('Error in emergency stop:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset daily stats
// @route   POST /api/trading/reset-daily
// @access  Private
const resetDailyStats = async (req, res) => {
  try {
    const config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    await config.resetDailyStats();
    
    // Reset emergency stop if it was due to daily loss limit
    if (config.emergencyStopReason === 'Daily loss limit reached') {
      config.emergencyStop = false;
      config.emergencyStopReason = '';
      config.capitalConservationMode = false;
      await config.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Daily stats reset successfully'
    });
  } catch (error) {
    console.error('Error resetting daily stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update coin configuration
// @route   PUT /api/trading/coins/:symbol
// @access  Private
const updateCoinConfig = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { enabled, maxPositionSize, stopLossPercentage, takeProfitPercentage, customRules } = req.body;
    
    const config = await TradingConfig.findOne({ userId: req.user.id });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Trading configuration not found'
      });
    }
    
    // Find existing coin config or create new one
    let coinConfigIndex = config.coinConfigs.findIndex(coin => coin.symbol === symbol);
    
    if (coinConfigIndex === -1) {
      // Add new coin config
      config.coinConfigs.push({
        symbol,
        enabled: enabled !== undefined ? enabled : true,
        maxPositionSize: maxPositionSize || 0.05,
        stopLossPercentage: stopLossPercentage || 0.02,
        takeProfitPercentage: takeProfitPercentage || 0.04,
        customRules: customRules || ''
      });
    } else {
      // Update existing coin config
      if (enabled !== undefined) config.coinConfigs[coinConfigIndex].enabled = enabled;
      if (maxPositionSize !== undefined) config.coinConfigs[coinConfigIndex].maxPositionSize = maxPositionSize;
      if (stopLossPercentage !== undefined) config.coinConfigs[coinConfigIndex].stopLossPercentage = stopLossPercentage;
      if (takeProfitPercentage !== undefined) config.coinConfigs[coinConfigIndex].takeProfitPercentage = takeProfitPercentage;
      if (customRules !== undefined) config.coinConfigs[coinConfigIndex].customRules = customRules;
    }
    
    await config.save();
    
    res.status(200).json({
      success: true,
      data: config.coinConfigs,
      message: `Coin configuration updated for ${symbol}`
    });
  } catch (error) {
    console.error('Error updating coin config:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get trading performance metrics
// @route   GET /api/trading/performance
// @access  Private
const getPerformanceMetrics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    // Get trades in the period
    const trades = await Trade.find({
      userId: req.user.id,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });
    
    if (trades.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalTrades: 0,
          winRate: 0,
          totalPnL: 0,
          avgPnL: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          profitFactor: 0,
          avgHoldingTime: 0,
          bestTrade: null,
          worstTrade: null,
          dailyPnL: []
        }
      });
    }
    
    // Calculate metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0);
    const losingTrades = trades.filter(trade => (trade.pnl || 0) < 0);
    const winRate = (winningTrades.length / totalTrades) * 100;
    
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const avgPnL = totalPnL / totalTrades;
    
    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // Calculate max drawdown
    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    for (const trade of trades) {
      runningPnL += trade.pnl || 0;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(trade => (trade.pnl || 0) / (trade.entryPrice * trade.quantity));
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Calculate average holding time
    const holdingTimes = trades
      .filter(trade => trade.exitTime)
      .map(trade => (new Date(trade.exitTime) - new Date(trade.entryTime)) / (1000 * 60)); // minutes
    const avgHoldingTime = holdingTimes.length > 0 
      ? holdingTimes.reduce((sum, time) => sum + time, 0) / holdingTimes.length 
      : 0;
    
    // Find best and worst trades
    const bestTrade = trades.reduce((best, trade) => 
      (trade.pnl || 0) > (best?.pnl || -Infinity) ? trade : best, null);
    const worstTrade = trades.reduce((worst, trade) => 
      (trade.pnl || 0) < (worst?.pnl || Infinity) ? trade : worst, null);
    
    // Calculate daily P&L
    const dailyPnL = {};
    trades.forEach(trade => {
      const date = new Date(trade.createdAt).toISOString().split('T')[0];
      dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
    });
    
    const dailyPnLArray = Object.entries(dailyPnL).map(([date, pnl]) => ({
      date,
      pnl
    }));
    
    res.status(200).json({
      success: true,
      data: {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        avgPnL: Math.round(avgPnL * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 1000) / 1000,
        profitFactor: Math.round(profitFactor * 100) / 100,
        avgHoldingTime: Math.round(avgHoldingTime * 10) / 10,
        bestTrade,
        worstTrade,
        dailyPnL: dailyPnLArray
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getTradingConfig,
  updateTradingConfig,
  getTradingStatus,
  startTrading,
  stopTrading,
  emergencyStop,
  resetDailyStats,
  updateCoinConfig,
  getPerformanceMetrics
};


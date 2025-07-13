const User = require("../models/User");
const Trade = require("../models/Trade");
const SystemLog = require("../models/SystemLog");
const { encrypt, decrypt } = require("../utils/encryption");

// @desc    Get user dashboard data
// @route   GET /api/user/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Get recent trades
    const recentTrades = await Trade.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate today's PnL
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTrades = await Trade.find({
      userId: req.user.id,
      createdAt: { $gte: today },
      status: "FILLED",
    });

    const todayPnL = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    // Get current active trades
    const activeTrades = await Trade.find({
      userId: req.user.id,
      status: "PENDING",
    });

    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        recentTrades,
        todayPnL,
        activeTrades,
        stats: {
          totalTrades: user.totalTrades,
          winningTrades: user.winningTrades,
          totalPnL: user.totalPnL,
          winRate: user.totalTrades > 0 ? (user.winningTrades / user.totalTrades) * 100 : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Delta Exchange API keys
// @route   PUT /api/user/delta-keys
// @access  Private
const updateDeltaKeys = async (req, res, next) => {
  try {
    const { apiKey, apiSecret } = req.body;

    // Encrypt API keys before storing
    const encryptedApiKey = encrypt(apiKey);
    const encryptedApiSecret = encrypt(apiSecret);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        deltaApiKey: encryptedApiKey,
        deltaApiSecret: encryptedApiSecret,
        deltaConnected: true,
      },
      { new: true }
    );

    // Log API key update
    await SystemLog.log("info", "Delta API keys updated", "user", {
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Delta Exchange API keys updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update trading settings
// @route   PUT /api/user/trading-settings
// @access  Private
const updateTradingSettings = async (req, res, next) => {
  try {
    const { enabledCoins, tradingActive, paperTradingMode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        enabledCoins,
        tradingActive,
        paperTradingMode,
      },
      { new: true }
    );

    // Log settings update
    await SystemLog.log("info", "Trading settings updated", "user", {
      userId: req.user.id,
      enabledCoins,
      tradingActive,
      paperTradingMode,
    });

    res.status(200).json({
      success: true,
      message: "Trading settings updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI strategy toggles
// @route   PUT /api/user/ai-strategies
// @access  Private
const updateAIStrategies = async (req, res, next) => {
  try {
    const { aiStrategies } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { aiStrategies },
      { new: true }
    );

    // Log strategy update
    await SystemLog.log("info", "AI strategies updated", "user", {
      userId: req.user.id,
      strategies: Object.keys(aiStrategies).filter((key) => aiStrategies[key]),
    });

    res.status(200).json({
      success: true,
      message: "AI strategies updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update risk settings
// @route   PUT /api/user/risk-settings
// @access  Private
const updateRiskSettings = async (req, res, next) => {
  try {
    const { riskSettings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { riskSettings },
      { new: true }
    );

    // Log risk settings update
    await SystemLog.log("info", "Risk settings updated", "user", {
      userId: req.user.id,
      riskSettings,
    });

    res.status(200).json({
      success: true,
      message: "Risk settings updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user trades
// @route   GET /api/user/trades
// @access  Private
const getTrades = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, symbol, startDate, endDate } = req.query;

    // Build filter
    const filter = { userId: req.user.id };

    if (status) filter.status = status;
    if (symbol) filter.symbol = symbol;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Trade.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        trades,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user referral data
// @route   GET /api/user/referral
// @access  Private
const getReferralData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Get referred users
    const referredUsers = await User.find({ referredBy: user.referralCode })
      .select("name email createdAt subscriptionPlan")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralEarnings: user.referralEarnings,
        referredUsers,
        totalReferrals: referredUsers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start/Stop trading
// @route   POST /api/user/toggle-trading
// @access  Private
const toggleTrading = async (req, res, next) => {
  try {
    const { tradingActive } = req.body;

    // Check if user has Delta API keys
    const user = await User.findById(req.user.id);
    if (!user.deltaConnected) {
      return res.status(400).json({
        success: false,
        message: "Please connect your Delta Exchange API keys first",
      });
    }

    // Check subscription
    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Active subscription required to start trading",
      });
    }

    user.tradingActive = tradingActive;
    await user.save();

    // Log trading toggle
    await SystemLog.log(
      "info",
      `Trading ${tradingActive ? "started" : "stopped"}`,
      "trading",
      {
        userId: req.user.id,
        tradingActive,
      }
    );

    res.status(200).json({
      success: true,
      message: `Trading ${tradingActive ? "started" : "stopped"} successfully`,
      tradingActive,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        riskSettings: user.riskSettings,
        notifications: user.notifications,
        enabledCoins: user.enabledCoins,
        tradingActive: user.tradingActive,
        paperTradingMode: user.paperTradingMode,
        deltaConnected: user.deltaConnected,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user settings
// @route   PUT /api/user/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const { riskSettings, notifications, enabledCoins, paperTradingMode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        riskSettings,
        notifications,
        enabledCoins,
        paperTradingMode,
      },
      { new: true }
    );

    await SystemLog.log("info", "User settings updated", "user", {
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "User settings updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  updateProfile,
  updateDeltaKeys,
  updateTradingSettings,
  updateAIStrategies,
  updateRiskSettings,
  getTrades,
  getReferralData,
  toggleTrading,
  getSettings,
  updateSettings,
};



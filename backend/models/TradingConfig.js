const mongoose = require('mongoose');

const tradingConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Risk Management Settings
  dailyLossLimit: {
    type: Number,
    default: 1000,
    min: 100,
    max: 50000
  },
  
  maxTradeSize: {
    type: Number,
    default: 0.1, // 10% of capital
    min: 0.01,
    max: 0.5
  },
  
  capitalConservationMode: {
    type: Boolean,
    default: false
  },
  
  riskRewardRatio: {
    type: Number,
    default: 2.0,
    min: 1.0,
    max: 10.0
  },
  
  // Stop Loss Settings
  useTrailingStopLoss: {
    type: Boolean,
    default: true
  },
  
  trailingStopPercentage: {
    type: Number,
    default: 0.02, // 2%
    min: 0.005,
    max: 0.1
  },
  
  useDynamicStopLoss: {
    type: Boolean,
    default: true
  },
  
  baseStopLossPercentage: {
    type: Number,
    default: 0.02, // 2%
    min: 0.005,
    max: 0.1
  },
  
  // Position Sizing
  useConfidenceBasedSizing: {
    type: Boolean,
    default: true
  },
  
  minConfidenceThreshold: {
    type: Number,
    default: 0.6,
    min: 0.1,
    max: 0.95
  },
  
  // Coin-specific Settings
  coinConfigs: [{
    symbol: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    maxPositionSize: {
      type: Number,
      default: 0.05, // 5% per coin
      min: 0.01,
      max: 0.2
    },
    stopLossPercentage: {
      type: Number,
      default: 0.02
    },
    takeProfitPercentage: {
      type: Number,
      default: 0.04
    },
    customRules: {
      type: String,
      default: ''
    }
  }],
  
  // Strategy Settings
  enabledStrategies: [{
    type: String,
    enum: ['momentum', 'mean_reversion', 'breakout', 'scalping'],
    default: ['momentum', 'mean_reversion']
  }],
  
  strategyWeights: {
    momentum: {
      type: Number,
      default: 0.4,
      min: 0,
      max: 1
    },
    mean_reversion: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    },
    breakout: {
      type: Number,
      default: 0.2,
      min: 0,
      max: 1
    },
    scalping: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1
    }
  },
  
  // AI Settings
  aiToggles: {
    volatilityScanner: {
      type: Boolean,
      default: true
    },
    sentimentTrigger: {
      type: Boolean,
      default: true
    },
    trailingStop: {
      type: Boolean,
      default: true
    },
    profitOptimizer: {
      type: Boolean,
      default: true
    },
    entryTimingFilter: {
      type: Boolean,
      default: true
    },
    capitalConservationMode: {
      type: Boolean,
      default: true
    }
  },
  
  // Trading Hours
  tradingHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '17:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Notification Settings
  notifications: {
    tradeExecuted: {
      type: Boolean,
      default: true
    },
    dailyPnLSummary: {
      type: Boolean,
      default: true
    },
    stopTriggerAlerts: {
      type: Boolean,
      default: true
    },
    emergencyAlerts: {
      type: Boolean,
      default: true
    }
  },
  
  // Performance Tracking
  dailyStats: {
    currentPnL: {
      type: Number,
      default: 0
    },
    tradesCount: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Emergency Controls
  emergencyStop: {
    type: Boolean,
    default: false
  },
  
  emergencyStopReason: {
    type: String,
    default: ''
  },
  
  lastModified: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Middleware to update lastModified
tradingConfigSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Method to reset daily stats
tradingConfigSchema.methods.resetDailyStats = function() {
  this.dailyStats.currentPnL = 0;
  this.dailyStats.tradesCount = 0;
  this.dailyStats.winRate = 0;
  this.dailyStats.lastResetDate = new Date();
  return this.save();
};

// Method to update daily P&L
tradingConfigSchema.methods.updateDailyPnL = function(pnl, isWin) {
  this.dailyStats.currentPnL += pnl;
  this.dailyStats.tradesCount += 1;
  
  // Check for daily loss limit
  if (Math.abs(this.dailyStats.currentPnL) >= this.dailyLossLimit) {
    this.emergencyStop = true;
    this.emergencyStopReason = 'Daily loss limit reached';
    this.capitalConservationMode = true;
  }
  
  return this.save();
};

// Method to check if trading is allowed
tradingConfigSchema.methods.isTradingAllowed = function() {
  if (this.emergencyStop) return false;
  if (!this.isActive) return false;
  
  // Check daily loss limit
  if (Math.abs(this.dailyStats.currentPnL) >= this.dailyLossLimit) {
    return false;
  }
  
  // Check trading hours if enabled
  if (this.tradingHours.enabled) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (currentTime < this.tradingHours.startTime || currentTime > this.tradingHours.endTime) {
      return false;
    }
  }
  
  return true;
};

// Method to get coin-specific config
tradingConfigSchema.methods.getCoinConfig = function(symbol) {
  const coinConfig = this.coinConfigs.find(config => config.symbol === symbol);
  
  if (coinConfig) {
    return coinConfig;
  }
  
  // Return default config if not found
  return {
    symbol: symbol,
    enabled: true,
    maxPositionSize: 0.05,
    stopLossPercentage: 0.02,
    takeProfitPercentage: 0.04,
    customRules: ''
  };
};

// Static method to get default config
tradingConfigSchema.statics.getDefaultConfig = function() {
  return {
    dailyLossLimit: 1000,
    maxTradeSize: 0.1,
    capitalConservationMode: false,
    riskRewardRatio: 2.0,
    useTrailingStopLoss: true,
    trailingStopPercentage: 0.02,
    useDynamicStopLoss: true,
    baseStopLossPercentage: 0.02,
    useConfidenceBasedSizing: true,
    minConfidenceThreshold: 0.6,
    enabledStrategies: ['momentum', 'mean_reversion'],
    strategyWeights: {
      momentum: 0.4,
      mean_reversion: 0.3,
      breakout: 0.2,
      scalping: 0.1
    },
    aiToggles: {
      volatilityScanner: true,
      sentimentTrigger: true,
      trailingStop: true,
      profitOptimizer: true,
      entryTimingFilter: true,
      capitalConservationMode: true
    }
  };
};

// Index for faster queries
tradingConfigSchema.index({ userId: 1 });
tradingConfigSchema.index({ isActive: 1 });
tradingConfigSchema.index({ emergencyStop: 1 });

module.exports = mongoose.model('TradingConfig', tradingConfigSchema);


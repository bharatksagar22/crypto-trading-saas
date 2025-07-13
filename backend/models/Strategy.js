const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategyName: {
    type: String,
    required: true
  },
  
  // Performance Metrics
  totalTrades: {
    type: Number,
    default: 0
  },
  winningTrades: {
    type: Number,
    default: 0
  },
  losingTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  totalPnL: {
    type: Number,
    default: 0
  },
  avgPnL: {
    type: Number,
    default: 0
  },
  maxDrawdown: {
    type: Number,
    default: 0
  },
  sharpeRatio: {
    type: Number,
    default: 0
  },
  
  // Confidence Learning
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  consecutiveLosses: {
    type: Number,
    default: 0
  },
  
  // Strategy Configuration
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
strategySchema.index({ userId: 1 });
strategySchema.index({ userId: 1, strategyName: 1 });

// Update performance metrics
strategySchema.methods.updatePerformance = function(trade) {
  this.totalTrades += 1;
  this.totalPnL += trade.pnl;
  this.avgPnL = this.totalPnL / this.totalTrades;
  
  if (trade.pnl > 0) {
    this.winningTrades += 1;
    this.consecutiveLosses = 0;
  } else {
    this.losingTrades += 1;
    this.consecutiveLosses += 1;
  }
  
  this.winRate = (this.winningTrades / this.totalTrades) * 100;
  
  // Update confidence score based on performance
  this.updateConfidenceScore(trade.pnl > 0);
};

// Update confidence score with learning
strategySchema.methods.updateConfidenceScore = function(isWin) {
  const learningRate = 0.1;
  const maxConfidence = 95;
  const minConfidence = 5;
  
  if (isWin) {
    this.confidenceScore = Math.min(
      maxConfidence,
      this.confidenceScore + (learningRate * (100 - this.confidenceScore))
    );
  } else {
    this.confidenceScore = Math.max(
      minConfidence,
      this.confidenceScore - (learningRate * this.confidenceScore)
    );
  }
  
  // Additional penalty for consecutive losses
  if (this.consecutiveLosses >= 3) {
    this.confidenceScore = Math.max(minConfidence, this.confidenceScore * 0.8);
  }
};

// Calculate Sharpe ratio
strategySchema.methods.calculateSharpeRatio = async function() {
  const Trade = require('./Trade');
  const trades = await Trade.find({ 
    userId: this.userId, 
    strategy: this.strategyName,
    status: 'FILLED'
  }).sort({ createdAt: -1 }).limit(30);
  
  if (trades.length < 10) return 0;
  
  const returns = trades.map(trade => trade.pnl);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  this.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0;
  return this.sharpeRatio;
};

module.exports = mongoose.model('Strategy', strategySchema);


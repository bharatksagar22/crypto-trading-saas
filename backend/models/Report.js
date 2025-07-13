const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Report Details
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  reportDate: {
    type: Date,
    required: true
  },
  
  // Performance Data
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
  totalPnL: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  sharpeRatio: {
    type: Number,
    default: 0
  },
  maxDrawdown: {
    type: Number,
    default: 0
  },
  
  // Strategy Breakdown
  strategyPerformance: [{
    strategyName: String,
    trades: Number,
    pnl: Number,
    winRate: Number
  }],
  
  // Coin Performance
  coinPerformance: [{
    symbol: String,
    trades: Number,
    pnl: Number,
    winRate: Number
  }],
  
  // File Paths
  pdfPath: String,
  csvPath: String,
  
  // Additional Metrics
  avgTradeSize: Number,
  avgHoldingTime: Number, // in minutes
  profitFactor: Number,
  maxConsecutiveWins: Number,
  maxConsecutiveLosses: Number
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ userId: 1, reportType: 1, reportDate: -1 });
reportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);


const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Trade Details
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  type: {
    type: String,
    enum: ['MARKET', 'LIMIT'],
    default: 'MARKET'
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  executedPrice: {
    type: Number,
    default: 0
  },
  
  // Trade Status
  status: {
    type: String,
    enum: ['PENDING', 'FILLED', 'CANCELLED', 'REJECTED'],
    default: 'PENDING'
  },
  orderId: {
    type: String,
    default: ''
  },
  
  // Strategy Info
  strategy: {
    type: String,
    required: true
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // PnL
  pnl: {
    type: Number,
    default: 0
  },
  fees: {
    type: Number,
    default: 0
  },
  
  // Risk Management
  stopLoss: Number,
  takeProfit: Number,
  
  // Additional Info
  leverage: {
    type: Number,
    default: 1
  },
  paperTrade: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  entryTime: Date,
  exitTime: Date
}, {
  timestamps: true
});

// Indexes
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, symbol: 1 });
tradeSchema.index({ userId: 1, status: 1 });

// Calculate PnL
tradeSchema.methods.calculatePnL = function() {
  if (this.status === 'FILLED' && this.executedPrice > 0) {
    const multiplier = this.side === 'BUY' ? 1 : -1;
    this.pnl = (this.executedPrice - this.price) * this.quantity * multiplier - this.fees;
  }
  return this.pnl;
};

// Update user stats after trade
tradeSchema.post('save', async function() {
  if (this.status === 'FILLED') {
    const User = require('./User');
    const user = await User.findById(this.userId);
    
    if (user) {
      user.totalTrades += 1;
      user.totalPnL += this.pnl;
      user.dailyPnL += this.pnl;
      
      if (this.pnl > 0) {
        user.winningTrades += 1;
        user.consecutiveLosses = 0;
      } else {
        user.consecutiveLosses += 1;
      }
      
      user.lastTradeDate = new Date();
      await user.save();
    }
  }
});

module.exports = mongoose.model('Trade', tradeSchema);


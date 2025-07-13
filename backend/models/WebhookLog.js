const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Webhook Data
  source: {
    type: String,
    required: true // 'tradingview', 'telegram', 'custom', etc.
  },
  signal: {
    type: mongoose.Schema.Types.Mixed,
    required: true // Raw webhook payload
  },
  
  // Processing
  processed: {
    type: Boolean,
    default: false
  },
  processingError: {
    type: String,
    default: ''
  },
  
  // Trade Execution
  tradeExecuted: {
    type: Boolean,
    default: false
  },
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  },
  
  // Additional Info
  ipAddress: String,
  userAgent: String,
  headers: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
webhookLogSchema.index({ userId: 1, createdAt: -1 });
webhookLogSchema.index({ processed: 1 });
webhookLogSchema.index({ source: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);


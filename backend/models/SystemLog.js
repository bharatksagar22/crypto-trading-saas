const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Log Details
  level: {
    type: String,
    enum: ['info', 'warning', 'error'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true // 'auth', 'trading', 'payment', 'webhook', etc.
  },
  
  // Additional Data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request Info
  ipAddress: String,
  userAgent: String,
  endpoint: String,
  method: String
}, {
  timestamps: true
});

// Indexes
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ userId: 1, createdAt: -1 });
systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ module: 1, createdAt: -1 });

// Static method to log events
systemLogSchema.statics.log = function(level, message, module, metadata = {}, userId = null) {
  return this.create({
    level,
    message,
    module,
    metadata,
    userId
  });
};

module.exports = mongoose.model('SystemLog', systemLogSchema);


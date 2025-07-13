const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not Google OAuth
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Delta Exchange API
  deltaApiKey: {
    type: String,
    default: ''
  },
  deltaApiSecret: {
    type: String,
    default: ''
  },
  deltaConnected: {
    type: Boolean,
    default: false
  },
  
  // Subscription
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'pro', 'elite'],
    default: 'basic'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'inactive'
  },
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  autoRenewal: {
    type: Boolean,
    default: true
  },
  
  // Trading Settings
  enabledCoins: {
    type: [String],
    default: ['BTC', 'ETH']
  },
  tradingActive: {
    type: Boolean,
    default: false
  },
  paperTradingMode: {
    type: Boolean,
    default: true
  },
  
  // AI Strategy Toggles
  aiStrategies: {
    volatilityScanner: { type: Boolean, default: true },
    newsSentimentTrigger: { type: Boolean, default: true },
    trailingStopLoss: { type: Boolean, default: true },
    profitOptimizer: { type: Boolean, default: true },
    smartEntryTiming: { type: Boolean, default: true },
    multiTimeframeAnalysis: { type: Boolean, default: true },
    aiLearningFeedback: { type: Boolean, default: true },
    weekendLowVolumeMode: { type: Boolean, default: true },
    autoRebalancer: { type: Boolean, default: true },
    autoLeverageOptimizer: { type: Boolean, default: true },
    optionChainAnalysis: { type: Boolean, default: false },
    greeksAnalysis: { type: Boolean, default: false },
    volumeSpikeEntry: { type: Boolean, default: true },
    highRRTradeFilter: { type: Boolean, default: true },
    preTradeRiskAnalyzer: { type: Boolean, default: true },
    confidenceBasedPositioning: { type: Boolean, default: true },
    capitalConservationMode: { type: Boolean, default: true },
    autoCapitalIncrease: { type: Boolean, default: true }
  },
  
  // Risk Management
  riskSettings: {
    dailyLossCap: { type: Number, default: 1000 },
    maxTradeCountPerDay: { type: Number, default: 10 },
    maxTradeSizePercent: { type: Number, default: 5 },
    maxLeverageCap: { type: Number, default: 10 },
    tradeSL: { type: Number, default: 250 },
    profitTargetPerTrade: { type: Number, default: 400 },
    trailingStopLossEnabled: { type: Boolean, default: true }
  },
  
  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: String,
  referralEarnings: {
    type: Number,
    default: 0
  },
  
  // Wallet
  walletBalance: {
    type: Number,
    default: 0
  },
  
  // Trading Stats
  totalTrades: { type: Number, default: 0 },
  winningTrades: { type: Number, default: 0 },
  totalPnL: { type: Number, default: 0 },
  dailyPnL: { type: Number, default: 0 },
  lastTradeDate: Date,
  consecutiveLosses: { type: Number, default: 0 },
  
  // Last Activity
  lastLogin: Date,
  lastApiCall: Date
}, {
  timestamps: true
});

// Generate referral code before saving
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// Generate unique referral code
userSchema.methods.generateReferralCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.deltaApiKey;
  delete user.deltaApiSecret;
  return user;
};

module.exports = mongoose.model('User', userSchema);


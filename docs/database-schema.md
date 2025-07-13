# Database Schema Design

## MongoDB Collections

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  googleId: String (optional),
  isActive: Boolean (default: false),
  isApproved: Boolean (default: false),
  role: String (enum: ['user', 'admin']),
  
  // Delta Exchange API
  deltaApiKey: String (encrypted),
  deltaApiSecret: String (encrypted),
  deltaConnected: Boolean (default: false),
  
  // Subscription
  subscriptionPlan: String (enum: ['basic', 'pro', 'elite']),
  subscriptionStatus: String (enum: ['active', 'inactive', 'expired']),
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  autoRenewal: Boolean (default: true),
  
  // Trading Settings
  enabledCoins: [String], // ['BTC', 'ETH', etc.]
  tradingActive: Boolean (default: false),
  paperTradingMode: Boolean (default: true),
  
  // AI Strategy Toggles
  aiStrategies: {
    volatilityScanner: Boolean (default: true),
    newsSentimentTrigger: Boolean (default: true),
    trailingStopLoss: Boolean (default: true),
    profitOptimizer: Boolean (default: true),
    smartEntryTiming: Boolean (default: true),
    multiTimeframeAnalysis: Boolean (default: true),
    aiLearningFeedback: Boolean (default: true),
    weekendLowVolumeMode: Boolean (default: true),
    autoRebalancer: Boolean (default: true),
    autoLeverageOptimizer: Boolean (default: true),
    optionChainAnalysis: Boolean (default: false),
    greeksAnalysis: Boolean (default: false),
    volumeSpikeEntry: Boolean (default: true),
    highRRTradeFilter: Boolean (default: true),
    preTradeRiskAnalyzer: Boolean (default: true),
    confidenceBasedPositioning: Boolean (default: true),
    capitalConservationMode: Boolean (default: true),
    autoCapitalIncrease: Boolean (default: true)
  },
  
  // Risk Management
  riskSettings: {
    dailyLossCap: Number (default: 1000),
    maxTradeCountPerDay: Number (default: 10),
    maxTradeSizePercent: Number (default: 5),
    maxLeverageCap: Number (default: 10),
    tradeSL: Number (default: 250),
    profitTargetPerTrade: Number (default: 400),
    trailingStopLossEnabled: Boolean (default: true)
  },
  
  // Referral
  referralCode: String (unique),
  referredBy: String (referral code),
  referralEarnings: Number (default: 0),
  
  // Wallet
  walletBalance: Number (default: 0),
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Trades Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  
  // Trade Details
  symbol: String, // 'BTCUSDT'
  side: String (enum: ['BUY', 'SELL']),
  type: String (enum: ['MARKET', 'LIMIT']),
  quantity: Number,
  price: Number,
  executedPrice: Number,
  
  // Trade Status
  status: String (enum: ['PENDING', 'FILLED', 'CANCELLED', 'REJECTED']),
  orderId: String, // Delta Exchange order ID
  
  // Strategy Info
  strategy: String,
  confidenceScore: Number,
  
  // PnL
  pnl: Number,
  fees: Number,
  
  // Timestamps
  entryTime: Date,
  exitTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Strategies Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  strategyName: String,
  
  // Performance Metrics
  totalTrades: Number (default: 0),
  winningTrades: Number (default: 0),
  losingTrades: Number (default: 0),
  winRate: Number (default: 0),
  totalPnL: Number (default: 0),
  avgPnL: Number (default: 0),
  maxDrawdown: Number (default: 0),
  sharpeRatio: Number (default: 0),
  
  // Confidence Learning
  confidenceScore: Number (default: 50),
  consecutiveLosses: Number (default: 0),
  
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Payments Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  
  // Payment Details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  amount: Number,
  currency: String (default: 'INR'),
  status: String (enum: ['created', 'paid', 'failed', 'refunded']),
  
  // Plan Details
  planType: String (enum: ['basic', 'pro', 'elite']),
  planDuration: Number, // in months
  
  // Discounts
  couponCode: String,
  discountPercent: Number,
  referralDiscount: Number,
  finalAmount: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Coupons Collection
```javascript
{
  _id: ObjectId,
  code: String (unique),
  discountPercent: Number,
  maxUses: Number,
  currentUses: Number (default: 0),
  validFrom: Date,
  validTo: Date,
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: Users),
  createdAt: Date,
  updatedAt: Date
}
```

### 6. WebhookLogs Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  
  // Webhook Data
  source: String, // 'tradingview', 'telegram', etc.
  signal: Object, // Raw webhook payload
  
  // Processing
  processed: Boolean (default: false),
  processingError: String,
  
  // Trade Execution
  tradeExecuted: Boolean (default: false),
  tradeId: ObjectId (ref: Trades),
  
  createdAt: Date,
  updatedAt: Date
}
```

### 7. SystemLogs Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users, optional),
  
  // Log Details
  level: String (enum: ['info', 'warning', 'error']),
  message: String,
  module: String, // 'auth', 'trading', 'payment', etc.
  
  // Additional Data
  metadata: Object,
  
  createdAt: Date
}
```

### 8. Reports Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  
  // Report Details
  reportType: String (enum: ['daily', 'weekly', 'monthly']),
  reportDate: Date,
  
  // Performance Data
  totalTrades: Number,
  winningTrades: Number,
  losingTrades: Number,
  totalPnL: Number,
  winRate: Number,
  sharpeRatio: Number,
  maxDrawdown: Number,
  
  // Strategy Breakdown
  strategyPerformance: [{
    strategyName: String,
    trades: Number,
    pnl: Number,
    winRate: Number
  }],
  
  // File Paths
  pdfPath: String,
  csvPath: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

### Users Collection
- `{ email: 1 }` (unique)
- `{ referralCode: 1 }` (unique)
- `{ googleId: 1 }`

### Trades Collection
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1, symbol: 1 }`
- `{ userId: 1, status: 1 }`

### Strategies Collection
- `{ userId: 1 }`

### Payments Collection
- `{ userId: 1, createdAt: -1 }`
- `{ razorpayOrderId: 1 }`

### WebhookLogs Collection
- `{ userId: 1, createdAt: -1 }`
- `{ processed: 1 }`

### SystemLogs Collection
- `{ createdAt: -1 }`
- `{ userId: 1, createdAt: -1 }`

### Reports Collection
- `{ userId: 1, reportType: 1, reportDate: -1 }`


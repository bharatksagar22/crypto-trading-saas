const axios = require('axios');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Strategy = require('../models/Strategy');
const WebhookLog = require('../models/WebhookLog');
const SystemLog = require('../models/SystemLog');
const { decrypt } = require('../utils/encryption');

// Delta Exchange API base URL
const DELTA_API_BASE = process.env.DELTA_API_URL || 'https://api.delta.exchange';

// Process webhook signal
const processWebhookSignal = async (user, signal, webhookLogId) => {
  try {
    // Parse signal
    const parsedSignal = parseSignal(signal);
    if (!parsedSignal) {
      throw new Error('Invalid signal format');
    }

    // Check if coin is enabled
    if (!user.enabledCoins.includes(parsedSignal.symbol)) {
      throw new Error(`Trading not enabled for ${parsedSignal.symbol}`);
    }

    // Check daily trade limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTrades = await Trade.countDocuments({
      userId: user._id,
      createdAt: { $gte: today }
    });

    if (todayTrades >= user.riskSettings.maxTradeCountPerDay) {
      throw new Error('Daily trade limit reached');
    }

    // Check consecutive losses
    if (user.consecutiveLosses >= 3) {
      throw new Error('Trading stopped due to consecutive losses');
    }

    // Check daily loss cap
    const todayPnL = await Trade.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: today },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: null,
          totalPnL: { $sum: '$pnl' }
        }
      }
    ]);

    const currentDayPnL = todayPnL[0]?.totalPnL || 0;
    if (currentDayPnL <= -user.riskSettings.dailyLossCap) {
      throw new Error('Daily loss cap reached');
    }

    // Execute trade
    const trade = await executeTrade(user, parsedSignal);

    // Update webhook log
    await WebhookLog.findByIdAndUpdate(webhookLogId, {
      processed: true,
      tradeExecuted: true,
      tradeId: trade._id
    });

    // Log successful processing
    await SystemLog.log('info', 'Webhook signal processed successfully', 'trading', {
      userId: user._id,
      webhookLogId,
      tradeId: trade._id,
      symbol: parsedSignal.symbol,
      side: parsedSignal.side
    });

    return trade;
  } catch (error) {
    // Update webhook log with error
    await WebhookLog.findByIdAndUpdate(webhookLogId, {
      processed: true,
      processingError: error.message
    });

    // Log error
    await SystemLog.log('error', `Webhook processing failed: ${error.message}`, 'trading', {
      userId: user._id,
      webhookLogId,
      error: error.message
    });

    throw error;
  }
};

// Parse trading signal
const parseSignal = (signal) => {
  try {
    // Handle different signal formats
    if (typeof signal === 'string') {
      // Parse TradingView alert format
      const lines = signal.split('\n');
      const action = lines.find(line => line.includes('ACTION:'))?.split(':')[1]?.trim();
      const symbol = lines.find(line => line.includes('SYMBOL:'))?.split(':')[1]?.trim();
      const price = parseFloat(lines.find(line => line.includes('PRICE:'))?.split(':')[1]?.trim());
      
      if (action && symbol) {
        return {
          symbol: symbol.replace('USDT', ''),
          side: action.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
          price: price || null,
          type: 'MARKET'
        };
      }
    } else if (typeof signal === 'object') {
      // Handle JSON signal format
      return {
        symbol: signal.symbol?.replace('USDT', ''),
        side: signal.action?.toUpperCase() || signal.side?.toUpperCase(),
        price: signal.price ? parseFloat(signal.price) : null,
        type: signal.type?.toUpperCase() || 'MARKET',
        quantity: signal.quantity ? parseFloat(signal.quantity) : null
      };
    }

    return null;
  } catch (error) {
    console.error('Signal parsing error:', error);
    return null;
  }
};

// Execute trade
const executeTrade = async (user, signal) => {
  try {
    // Get current market price if not provided
    let price = signal.price;
    if (!price) {
      price = await getCurrentPrice(signal.symbol);
    }

    // Calculate position size based on risk settings
    const positionSize = calculatePositionSize(user, price);

    // Create trade record
    const trade = await Trade.create({
      userId: user._id,
      symbol: signal.symbol + 'USDT',
      side: signal.side,
      type: signal.type || 'MARKET',
      quantity: signal.quantity || positionSize,
      price: price,
      strategy: 'webhook_signal',
      confidenceScore: 75, // Default confidence for webhook signals
      paperTrade: user.paperTradingMode
    });

    // Execute on Delta Exchange if not paper trading
    if (!user.paperTradingMode && user.deltaConnected) {
      try {
        const deltaOrder = await executeDeltaOrder(user, trade);
        trade.orderId = deltaOrder.id;
        trade.status = 'PENDING';
        await trade.save();
      } catch (deltaError) {
        console.error('Delta execution error:', deltaError);
        trade.status = 'REJECTED';
        await trade.save();
        throw deltaError;
      }
    } else {
      // Simulate paper trade execution
      trade.status = 'FILLED';
      trade.executedPrice = price;
      await trade.save();
    }

    return trade;
  } catch (error) {
    console.error('Trade execution error:', error);
    throw error;
  }
};

// Calculate position size based on risk settings
const calculatePositionSize = (user, price) => {
  const maxTradeSize = user.riskSettings.maxTradeSizePercent / 100;
  const accountBalance = 10000; // This should come from Delta API
  const maxPositionValue = accountBalance * maxTradeSize;
  
  return Math.floor(maxPositionValue / price * 100) / 100; // Round to 2 decimal places
};

// Get current market price
const getCurrentPrice = async (symbol) => {
  try {
    // This is a placeholder - implement actual price fetching from Delta Exchange
    const response = await axios.get(`${DELTA_API_BASE}/v2/tickers/${symbol}USDT`);
    return parseFloat(response.data.result.mark_price);
  } catch (error) {
    console.error('Price fetching error:', error);
    // Return a default price for demo purposes
    return 50000; // Default BTC price
  }
};

// Execute order on Delta Exchange
const executeDeltaOrder = async (user, trade) => {
  try {
    // Decrypt API keys
    const apiKey = decrypt(user.deltaApiKey);
    const apiSecret = decrypt(user.deltaApiSecret);

    if (!apiKey || !apiSecret) {
      throw new Error('Delta API keys not configured');
    }

    // Prepare order data
    const orderData = {
      product_id: getProductId(trade.symbol),
      side: trade.side.toLowerCase(),
      order_type: trade.type.toLowerCase(),
      size: trade.quantity.toString(),
      ...(trade.type === 'LIMIT' && { limit_price: trade.price.toString() })
    };

    // Create signature for Delta API
    const timestamp = Date.now().toString();
    const signature = createDeltaSignature(apiSecret, timestamp, 'POST', '/v2/orders', orderData);

    // Execute order
    const response = await axios.post(`${DELTA_API_BASE}/v2/orders`, orderData, {
      headers: {
        'api-key': apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      }
    });

    return response.data.result;
  } catch (error) {
    console.error('Delta order execution error:', error);
    throw new Error('Failed to execute order on Delta Exchange');
  }
};

// Get Delta Exchange product ID
const getProductId = (symbol) => {
  // This is a simplified mapping - implement proper product ID resolution
  const symbolMap = {
    'BTCUSDT': 1,
    'ETHUSDT': 2,
    'ADAUSDT': 3,
    'DOTUSDT': 4,
    'LINKUSDT': 5
  };
  
  return symbolMap[symbol] || 1;
};

// Create Delta Exchange API signature
const createDeltaSignature = (secret, timestamp, method, path, body = '') => {
  const crypto = require('crypto');
  const payload = method + timestamp + path + (body ? JSON.stringify(body) : '');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

// AI Trading Engine - Process AI signals
const processAISignal = async (user, aiSignal) => {
  try {
    // Check if AI strategies are enabled
    const enabledStrategies = Object.keys(user.aiStrategies).filter(
      key => user.aiStrategies[key]
    );

    if (!enabledStrategies.includes(aiSignal.strategy)) {
      throw new Error(`AI strategy ${aiSignal.strategy} is not enabled`);
    }

    // Get or create strategy record
    let strategy = await Strategy.findOne({
      userId: user._id,
      strategyName: aiSignal.strategy
    });

    if (!strategy) {
      strategy = await Strategy.create({
        userId: user._id,
        strategyName: aiSignal.strategy,
        confidenceScore: 50
      });
    }

    // Check strategy confidence
    if (strategy.confidenceScore < 30) {
      throw new Error('Strategy confidence too low');
    }

    // Execute trade with AI confidence
    const trade = await executeTrade(user, {
      ...aiSignal,
      confidenceScore: strategy.confidenceScore
    });

    // Update strategy performance
    strategy.updatePerformance(trade);
    await strategy.save();

    return trade;
  } catch (error) {
    console.error('AI signal processing error:', error);
    throw error;
  }
};

// Get user trading status
const getTradingStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    // Get active trades
    const activeTrades = await Trade.find({
      userId,
      status: 'PENDING'
    });

    // Get today's performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTrades = await Trade.find({
      userId,
      createdAt: { $gte: today },
      status: 'FILLED'
    });

    const todayPnL = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    return {
      tradingActive: user.tradingActive,
      deltaConnected: user.deltaConnected,
      paperTradingMode: user.paperTradingMode,
      activeTrades: activeTrades.length,
      todayTrades: todayTrades.length,
      todayPnL,
      consecutiveLosses: user.consecutiveLosses,
      enabledCoins: user.enabledCoins
    };
  } catch (error) {
    console.error('Get trading status error:', error);
    throw error;
  }
};

module.exports = {
  processWebhookSignal,
  processAISignal,
  executeTrade,
  getTradingStatus,
  parseSignal,
  calculatePositionSize
};


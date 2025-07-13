"""
Ultra-Intelligent Autonomous AI Trading Agent
Sharp, Self-Learning, and Fully Autonomous
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import json
import pickle
from pathlib import Path

# Import custom modules
from .market_regime_detector import MarketRegimeDetector
from .strategy_engine import StrategyEngine
from .risk_manager import RiskManager
from .confidence_calculator import ConfidenceCalculator
from .position_sizer import PositionSizer
from .learning_engine import LearningEngine
from ..utils.delta_api import DeltaAPIClient
from ..utils.option_chain_analyzer import OptionChainAnalyzer
from ..utils.sentiment_analyzer import SentimentAnalyzer
from ..utils.volume_volatility_scanner import VolumeVolatilityScanner

class MarketRegime(Enum):
    BULL = "bull"
    BEAR = "bear"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"

class TradingMode(Enum):
    ACTIVE = "active"
    CONSERVATIVE = "conservative"
    STOPPED = "stopped"
    EMERGENCY_STOP = "emergency_stop"

@dataclass
class TradeDecision:
    action: str  # 'BUY', 'SELL', 'HOLD'
    symbol: str
    quantity: float
    price: float
    stop_loss: float
    take_profit: float
    confidence: float
    strategy: str
    reasoning: str
    risk_reward_ratio: float

@dataclass
class AgentState:
    daily_pnl: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    consecutive_losses: int = 0
    current_positions: Dict = None
    available_capital: float = 0.0
    trading_mode: TradingMode = TradingMode.ACTIVE
    last_trade_time: Optional[datetime] = None
    
    def __post_init__(self):
        if self.current_positions is None:
            self.current_positions = {}

class AutonomousAIAgent:
    """
    Ultra-Intelligent, Self-Learning AI Trading Agent
    
    Primary Objectives:
    - Maximize Daily Profit (Minimum ₹2,000/day)
    - Avoid Losses Beyond ₹1,000/day
    - Trade Only in User-Selected Coins
    - Keep Capital Safe and Profitable
    - Execute High-Confidence Strategies Only
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.logger = self._setup_logging()
        
        # Core Components
        self.delta_client = DeltaAPIClient(config['delta_api'])
        self.market_regime_detector = MarketRegimeDetector()
        self.strategy_engine = StrategyEngine()
        self.risk_manager = RiskManager(config['risk_management'])
        self.confidence_calculator = ConfidenceCalculator()
        self.position_sizer = PositionSizer()
        self.learning_engine = LearningEngine()
        
        # Analysis Tools
        self.option_chain_analyzer = OptionChainAnalyzer()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.volume_scanner = VolumeVolatilityScanner()
        
        # Agent State
        self.state = AgentState()
        self.enabled_coins = set(config.get('enabled_coins', []))
        
        # Performance Tracking
        self.performance_metrics = {
            'sharpe_ratio': 0.0,
            'win_rate': 0.0,
            'avg_profit': 0.0,
            'max_drawdown': 0.0,
            'total_trades': 0,
            'profitable_trades': 0
        }
        
        # Learning Data
        self.trade_history = []
        self.strategy_performance = {}
        self.market_patterns = {}
        
        # Load previous learning data
        self._load_learning_data()
        
        self.logger.info("🤖 Autonomous AI Agent initialized successfully")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging"""
        logger = logging.getLogger('AutonomousAIAgent')
        logger.setLevel(logging.INFO)
        
        # Create file handler
        handler = logging.FileHandler('ai_agent.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    async def start_trading(self):
        """Start the autonomous trading loop"""
        self.logger.info("🚀 Starting autonomous trading...")
        self.state.trading_mode = TradingMode.ACTIVE
        
        while self.state.trading_mode == TradingMode.ACTIVE:
            try:
                # Check if we should continue trading
                if not self._should_continue_trading():
                    break
                
                # Analyze market conditions
                market_data = await self._analyze_market_conditions()
                
                # Generate trading decisions
                decisions = await self._generate_trading_decisions(market_data)
                
                # Execute trades
                for decision in decisions:
                    if decision.confidence >= self.config['min_confidence_threshold']:
                        await self._execute_trade(decision)
                
                # Update learning models
                await self._update_learning_models()
                
                # Wait before next iteration
                await asyncio.sleep(self.config.get('scan_interval', 30))
                
            except Exception as e:
                self.logger.error(f"Error in trading loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    def _should_continue_trading(self) -> bool:
        """Check if trading should continue based on risk parameters"""
        
        # Check daily loss limit
        if self.state.daily_pnl <= -self.config['max_daily_loss']:
            self.logger.warning(f"Daily loss limit reached: ₹{abs(self.state.daily_pnl)}")
            self.state.trading_mode = TradingMode.STOPPED
            return False
        
        # Check consecutive losses
        if self.state.consecutive_losses >= 3:
            self.logger.warning("3 consecutive losses reached - switching to conservative mode")
            self.state.trading_mode = TradingMode.CONSERVATIVE
        
        # Check if daily target reached
        if self.state.daily_pnl >= self.config['daily_target']:
            self.logger.info(f"Daily target reached: ₹{self.state.daily_pnl}")
            # Continue trading but with reduced risk
            self.state.trading_mode = TradingMode.CONSERVATIVE
        
        return self.state.trading_mode != TradingMode.STOPPED
    
    async def _analyze_market_conditions(self) -> Dict:
        """Comprehensive market analysis"""
        
        market_data = {}
        
        # Get current market data for enabled coins
        for coin in self.enabled_coins:
            try:
                # Get price data
                price_data = await self.delta_client.get_price_data(coin)
                
                # Get option chain data
                option_data = await self.option_chain_analyzer.analyze(coin)
                
                # Get volume and volatility
                volume_data = await self.volume_scanner.scan(coin)
                
                # Get sentiment data
                sentiment_data = await self.sentiment_analyzer.analyze(coin)
                
                market_data[coin] = {
                    'price': price_data,
                    'options': option_data,
                    'volume': volume_data,
                    'sentiment': sentiment_data,
                    'timestamp': datetime.now()
                }
                
            except Exception as e:
                self.logger.error(f"Error analyzing {coin}: {e}")
        
        # Detect overall market regime
        market_data['regime'] = await self.market_regime_detector.detect(market_data)
        
        return market_data
    
    async def _generate_trading_decisions(self, market_data: Dict) -> List[TradeDecision]:
        """Generate intelligent trading decisions"""
        
        decisions = []
        
        for coin in self.enabled_coins:
            if coin not in market_data:
                continue
            
            coin_data = market_data[coin]
            
            # Skip if insufficient data
            if not self._has_sufficient_data(coin_data):
                continue
            
            # Generate strategies for this coin
            strategies = await self.strategy_engine.generate_strategies(
                coin, coin_data, market_data['regime']
            )
            
            # Evaluate each strategy
            for strategy in strategies:
                confidence = await self.confidence_calculator.calculate(
                    strategy, coin_data, self.strategy_performance
                )
                
                # Only consider high-confidence strategies
                if confidence >= self.config['min_confidence_threshold']:
                    
                    # Calculate position size
                    position_size = self.position_sizer.calculate(
                        self.state.available_capital,
                        confidence,
                        strategy['risk_level']
                    )
                    
                    # Create trade decision
                    decision = TradeDecision(
                        action=strategy['action'],
                        symbol=coin,
                        quantity=position_size,
                        price=coin_data['price']['current'],
                        stop_loss=strategy['stop_loss'],
                        take_profit=strategy['take_profit'],
                        confidence=confidence,
                        strategy=strategy['name'],
                        reasoning=strategy['reasoning'],
                        risk_reward_ratio=strategy['risk_reward_ratio']
                    )
                    
                    # Validate with risk manager
                    if self.risk_manager.validate_trade(decision, self.state):
                        decisions.append(decision)
        
        # Sort by confidence and select best opportunities
        decisions.sort(key=lambda x: x.confidence, reverse=True)
        
        # Limit number of simultaneous trades
        max_trades = self.config.get('max_simultaneous_trades', 3)
        return decisions[:max_trades]
    
    async def _execute_trade(self, decision: TradeDecision):
        """Execute a trading decision"""
        
        try:
            self.logger.info(f"🎯 Executing {decision.action} for {decision.symbol}")
            self.logger.info(f"   Confidence: {decision.confidence:.2f}%")
            self.logger.info(f"   Strategy: {decision.strategy}")
            self.logger.info(f"   R:R Ratio: {decision.risk_reward_ratio:.2f}")
            
            # Calculate brokerage cost
            brokerage_cost = self._calculate_brokerage(decision)
            
            # Adjust for brokerage in profit calculations
            adjusted_take_profit = decision.take_profit - brokerage_cost
            
            # Execute the trade via Delta API
            trade_result = await self.delta_client.place_order(
                symbol=decision.symbol,
                side=decision.action.lower(),
                quantity=decision.quantity,
                price=decision.price,
                stop_loss=decision.stop_loss,
                take_profit=adjusted_take_profit
            )
            
            if trade_result['success']:
                # Update state
                self.state.total_trades += 1
                self.state.last_trade_time = datetime.now()
                
                # Store trade for learning
                trade_record = {
                    'timestamp': datetime.now(),
                    'decision': decision,
                    'execution': trade_result,
                    'market_conditions': await self._get_current_market_snapshot(),
                    'brokerage_cost': brokerage_cost
                }
                
                self.trade_history.append(trade_record)
                
                # Update current positions
                self.state.current_positions[decision.symbol] = {
                    'quantity': decision.quantity,
                    'entry_price': trade_result['executed_price'],
                    'stop_loss': decision.stop_loss,
                    'take_profit': adjusted_take_profit,
                    'strategy': decision.strategy,
                    'entry_time': datetime.now()
                }
                
                self.logger.info(f"✅ Trade executed successfully: {trade_result['order_id']}")
                
            else:
                self.logger.error(f"❌ Trade execution failed: {trade_result['error']}")
                
        except Exception as e:
            self.logger.error(f"Error executing trade: {e}")
    
    def _calculate_brokerage(self, decision: TradeDecision) -> float:
        """Calculate brokerage cost for the trade"""
        
        trade_value = decision.quantity * decision.price
        
        # Delta Exchange brokerage structure
        brokerage_rate = self.config.get('brokerage_rate', 0.0005)  # 0.05%
        brokerage = trade_value * brokerage_rate
        
        # Add any fixed charges
        fixed_charges = self.config.get('fixed_charges', 0)
        
        return brokerage + fixed_charges
    
    async def _update_learning_models(self):
        """Update AI learning models based on recent performance"""
        
        # Update strategy performance
        await self._update_strategy_performance()
        
        # Update market pattern recognition
        await self._update_market_patterns()
        
        # Retrain confidence models
        await self.confidence_calculator.retrain(self.trade_history)
        
        # Update risk parameters based on performance
        await self.risk_manager.adapt_parameters(self.performance_metrics)
        
        # Save learning data
        self._save_learning_data()
    
    async def _update_strategy_performance(self):
        """Update performance metrics for each strategy"""
        
        for trade in self.trade_history[-10:]:  # Last 10 trades
            strategy_name = trade['decision'].strategy
            
            if strategy_name not in self.strategy_performance:
                self.strategy_performance[strategy_name] = {
                    'total_trades': 0,
                    'profitable_trades': 0,
                    'total_pnl': 0.0,
                    'avg_confidence': 0.0,
                    'sharpe_ratio': 0.0
                }
            
            # Update metrics (this would be done when trade closes)
            # For now, we'll simulate based on confidence
            perf = self.strategy_performance[strategy_name]
            perf['total_trades'] += 1
            
            # Simulate profit based on confidence and market conditions
            simulated_profit = self._simulate_trade_outcome(trade)
            perf['total_pnl'] += simulated_profit
            
            if simulated_profit > 0:
                perf['profitable_trades'] += 1
    
    def _simulate_trade_outcome(self, trade: Dict) -> float:
        """Simulate trade outcome for learning purposes"""
        
        confidence = trade['decision'].confidence
        risk_reward = trade['decision'].risk_reward_ratio
        
        # Higher confidence and better R:R should lead to better outcomes
        success_probability = confidence / 100.0
        
        if np.random.random() < success_probability:
            # Profitable trade
            return abs(trade['decision'].take_profit - trade['decision'].price) * trade['decision'].quantity
        else:
            # Loss
            return -abs(trade['decision'].price - trade['decision'].stop_loss) * trade['decision'].quantity
    
    async def _get_current_market_snapshot(self) -> Dict:
        """Get current market snapshot for learning"""
        
        return {
            'timestamp': datetime.now(),
            'regime': await self.market_regime_detector.get_current_regime(),
            'volatility': await self.volume_scanner.get_market_volatility(),
            'sentiment': await self.sentiment_analyzer.get_overall_sentiment()
        }
    
    def _has_sufficient_data(self, coin_data: Dict) -> bool:
        """Check if we have sufficient data for decision making"""
        
        required_fields = ['price', 'volume', 'sentiment']
        return all(field in coin_data for field in required_fields)
    
    def _load_learning_data(self):
        """Load previous learning data"""
        
        try:
            data_file = Path('ai_agent_learning.pkl')
            if data_file.exists():
                with open(data_file, 'rb') as f:
                    data = pickle.load(f)
                    self.strategy_performance = data.get('strategy_performance', {})
                    self.market_patterns = data.get('market_patterns', {})
                    self.performance_metrics = data.get('performance_metrics', {})
                    
                self.logger.info("📚 Learning data loaded successfully")
        except Exception as e:
            self.logger.error(f"Error loading learning data: {e}")
    
    def _save_learning_data(self):
        """Save learning data for persistence"""
        
        try:
            data = {
                'strategy_performance': self.strategy_performance,
                'market_patterns': self.market_patterns,
                'performance_metrics': self.performance_metrics,
                'last_updated': datetime.now()
            }
            
            with open('ai_agent_learning.pkl', 'wb') as f:
                pickle.dump(data, f)
                
        except Exception as e:
            self.logger.error(f"Error saving learning data: {e}")
    
    async def stop_trading(self, reason: str = "Manual stop"):
        """Stop trading and cleanup"""
        
        self.logger.info(f"🛑 Stopping trading: {reason}")
        self.state.trading_mode = TradingMode.STOPPED
        
        # Close all open positions if emergency stop
        if reason == "emergency":
            await self._close_all_positions()
        
        # Save final state
        self._save_learning_data()
    
    async def _close_all_positions(self):
        """Close all open positions"""
        
        for symbol, position in self.state.current_positions.items():
            try:
                await self.delta_client.close_position(symbol, position['quantity'])
                self.logger.info(f"🔒 Closed position for {symbol}")
            except Exception as e:
                self.logger.error(f"Error closing position for {symbol}: {e}")
    
    def get_performance_summary(self) -> Dict:
        """Get current performance summary"""
        
        return {
            'daily_pnl': self.state.daily_pnl,
            'total_trades': self.state.total_trades,
            'winning_trades': self.state.winning_trades,
            'win_rate': (self.state.winning_trades / max(self.state.total_trades, 1)) * 100,
            'consecutive_losses': self.state.consecutive_losses,
            'trading_mode': self.state.trading_mode.value,
            'current_positions': len(self.state.current_positions),
            'performance_metrics': self.performance_metrics
        }
    
    async def process_webhook_signal(self, signal: Dict):
        """Process external webhook signals"""
        
        try:
            self.logger.info(f"📡 Processing webhook signal: {signal}")
            
            # Validate signal
            if not self._validate_webhook_signal(signal):
                self.logger.warning("Invalid webhook signal received")
                return
            
            # Extract signal data
            symbol = signal.get('symbol')
            action = signal.get('action')
            confidence = signal.get('confidence', 50)
            
            # Only process if symbol is enabled
            if symbol not in self.enabled_coins:
                self.logger.info(f"Signal for {symbol} ignored - coin not enabled")
                return
            
            # Get current market data for the symbol
            market_data = await self._analyze_market_conditions()
            
            if symbol in market_data:
                # Create decision based on webhook signal
                decision = await self._create_webhook_decision(signal, market_data[symbol])
                
                # Validate with AI confidence
                ai_confidence = await self.confidence_calculator.validate_external_signal(
                    decision, market_data[symbol]
                )
                
                # Only execute if AI agrees with signal
                if ai_confidence >= self.config['min_confidence_threshold']:
                    await self._execute_trade(decision)
                else:
                    self.logger.info(f"Webhook signal rejected - AI confidence too low: {ai_confidence}")
            
        except Exception as e:
            self.logger.error(f"Error processing webhook signal: {e}")
    
    def _validate_webhook_signal(self, signal: Dict) -> bool:
        """Validate incoming webhook signal"""
        
        required_fields = ['symbol', 'action', 'timestamp']
        return all(field in signal for field in required_fields)
    
    async def _create_webhook_decision(self, signal: Dict, market_data: Dict) -> TradeDecision:
        """Create trading decision from webhook signal"""
        
        # Calculate position size based on signal confidence
        position_size = self.position_sizer.calculate(
            self.state.available_capital,
            signal.get('confidence', 50),
            'medium'
        )
        
        # Calculate stop loss and take profit
        current_price = market_data['price']['current']
        volatility = market_data['volume']['volatility']
        
        if signal['action'].upper() == 'BUY':
            stop_loss = current_price * (1 - volatility * 2)
            take_profit = current_price * (1 + volatility * 3)
        else:
            stop_loss = current_price * (1 + volatility * 2)
            take_profit = current_price * (1 - volatility * 3)
        
        return TradeDecision(
            action=signal['action'].upper(),
            symbol=signal['symbol'],
            quantity=position_size,
            price=current_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            confidence=signal.get('confidence', 50),
            strategy='webhook_signal',
            reasoning=f"External signal from {signal.get('source', 'unknown')}",
            risk_reward_ratio=abs(take_profit - current_price) / abs(current_price - stop_loss)
        )

# Configuration example
DEFAULT_CONFIG = {
    'delta_api': {
        'api_key': 'your_api_key',
        'api_secret': 'your_api_secret',
        'testnet': True
    },
    'risk_management': {
        'max_daily_loss': 1000,
        'daily_target': 2000,
        'max_position_size': 0.1,  # 10% of capital
        'max_simultaneous_trades': 3
    },
    'min_confidence_threshold': 70,
    'scan_interval': 30,
    'enabled_coins': ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
    'brokerage_rate': 0.0005,
    'fixed_charges': 0
}


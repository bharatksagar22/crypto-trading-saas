"""
AI Trading Engine Core
Main AI logic for market analysis and trading decisions
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json

from models.trading_signal import TradingSignal, SignalAction, SignalPriority
from models.user_config import UserConfig
from utils.market_data import MarketDataProvider
from utils.technical_analysis import TechnicalAnalyzer
from utils.sentiment_analysis import SentimentAnalyzer
from utils.ml_models import MLPredictor
from utils.risk_manager import RiskManager

logger = logging.getLogger(__name__)

class AITradingEngine:
    def __init__(self):
        self.market_data = MarketDataProvider()
        self.technical_analyzer = TechnicalAnalyzer()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.ml_predictor = MLPredictor()
        self.risk_manager = RiskManager()
        
        self.user_configs: Dict[str, UserConfig] = {}
        self.active_users: set = set()
        self.analysis_running = False
        self.analysis_interval = 60  # seconds
        
        # Performance tracking
        self.engine_stats = {
            "total_signals_generated": 0,
            "total_trades_executed": 0,
            "total_users_active": 0,
            "uptime_start": datetime.utcnow(),
            "last_analysis": None
        }

    async def start_analysis_loop(self):
        """Start the main AI analysis loop"""
        self.analysis_running = True
        logger.info("AI analysis loop started")
        
        while self.analysis_running:
            try:
                await self.run_analysis_cycle()
                await asyncio.sleep(self.analysis_interval)
            except Exception as e:
                logger.error(f"Analysis loop error: {str(e)}")
                await asyncio.sleep(5)  # Short delay before retry

    async def stop_analysis_loop(self):
        """Stop the AI analysis loop"""
        self.analysis_running = False
        logger.info("AI analysis loop stopped")

    async def run_analysis_cycle(self):
        """Run one cycle of AI analysis for all active users"""
        if not self.active_users:
            return
        
        logger.info(f"Running analysis cycle for {len(self.active_users)} active users")
        
        # Get market data for all symbols
        all_symbols = set()
        for user_id in self.active_users:
            config = self.user_configs.get(user_id)
            if config:
                all_symbols.update(config.enabled_coins)
        
        if not all_symbols:
            return
        
        # Fetch market data
        market_data = await self.market_data.get_market_data(list(all_symbols))
        
        # Analyze each user
        tasks = []
        for user_id in self.active_users:
            task = asyncio.create_task(
                self.analyze_user_portfolio(user_id, market_data)
            )
            tasks.append(task)
        
        # Wait for all analyses to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        self.engine_stats["last_analysis"] = datetime.utcnow()

    async def analyze_user_portfolio(self, user_id: str, market_data: Dict[str, Any]):
        """Analyze portfolio for a specific user"""
        try:
            config = self.user_configs.get(user_id)
            if not config or not config.trading_active:
                return
            
            # Generate signals for enabled coins
            signals = []
            for symbol in config.enabled_coins:
                if symbol in market_data:
                    symbol_signals = await self.analyze_symbol(
                        user_id, symbol, market_data[symbol], config
                    )
                    signals.extend(symbol_signals)
            
            # Process signals through risk management
            filtered_signals = await self.risk_manager.filter_signals(
                user_id, signals, config.risk_settings
            )
            
            # Execute high-priority signals
            for signal in filtered_signals:
                if signal.priority in [SignalPriority.HIGH, SignalPriority.URGENT]:
                    await self.execute_signal(signal)
            
            self.engine_stats["total_signals_generated"] += len(signals)
            
        except Exception as e:
            logger.error(f"User portfolio analysis error for {user_id}: {str(e)}")

    async def analyze_symbol(self, user_id: str, symbol: str, data: Dict[str, Any], config: UserConfig) -> List[TradingSignal]:
        """Analyze a specific symbol and generate trading signals"""
        signals = []
        
        try:
            # Technical analysis
            technical_signals = await self.technical_analyzer.analyze(symbol, data, config.ai_strategies)
            
            # Sentiment analysis (if enabled)
            sentiment_score = 0.0
            if config.ai_strategies.news_sentiment_trigger:
                sentiment_score = await self.sentiment_analyzer.get_sentiment(symbol)
            
            # ML prediction
            ml_prediction = None
            if config.use_machine_learning:
                ml_prediction = await self.ml_predictor.predict(symbol, data)
            
            # Combine analyses
            for tech_signal in technical_signals:
                # Calculate combined confidence
                confidence = self.calculate_combined_confidence(
                    tech_signal, sentiment_score, ml_prediction, config
                )
                
                if confidence >= config.min_confidence_for_execution:
                    signal = TradingSignal(
                        user_id=user_id,
                        symbol=symbol,
                        action=tech_signal["action"],
                        confidence_score=confidence,
                        strategy_name=tech_signal["strategy"],
                        reasoning=tech_signal["reasoning"],
                        current_price=data.get("price", 0),
                        market_trend=data.get("trend", "neutral"),
                        volatility=data.get("volatility", 0),
                        volume_ratio=data.get("volume_ratio", 1),
                        priority=self.determine_priority(confidence, tech_signal)
                    )
                    
                    # Add risk metrics
                    signal = await self.add_risk_metrics(signal, data, config)
                    signals.append(signal)
            
        except Exception as e:
            logger.error(f"Symbol analysis error for {symbol}: {str(e)}")
        
        return signals

    def calculate_combined_confidence(self, tech_signal: Dict, sentiment_score: float, ml_prediction: Optional[Dict], config: UserConfig) -> float:
        """Calculate combined confidence score from multiple sources"""
        
        # Base technical confidence
        confidence = tech_signal.get("confidence", 0.5)
        
        # Weight technical analysis
        weighted_confidence = confidence * config.technical_analysis_weight
        
        # Add sentiment if available
        if sentiment_score != 0:
            sentiment_weight = 0.2
            if tech_signal["action"] == SignalAction.BUY and sentiment_score > 0:
                weighted_confidence += sentiment_score * sentiment_weight
            elif tech_signal["action"] == SignalAction.SELL and sentiment_score < 0:
                weighted_confidence += abs(sentiment_score) * sentiment_weight
        
        # Add ML prediction if available
        if ml_prediction and config.use_machine_learning:
            ml_weight = 0.3
            if (tech_signal["action"] == SignalAction.BUY and ml_prediction["direction"] == "up") or \
               (tech_signal["action"] == SignalAction.SELL and ml_prediction["direction"] == "down"):
                weighted_confidence += ml_prediction["confidence"] * ml_weight
        
        # Normalize to 0-1 range
        return min(1.0, max(0.0, weighted_confidence))

    def determine_priority(self, confidence: float, tech_signal: Dict) -> SignalPriority:
        """Determine signal priority based on confidence and other factors"""
        if confidence >= 0.9:
            return SignalPriority.URGENT
        elif confidence >= 0.8:
            return SignalPriority.HIGH
        elif confidence >= 0.6:
            return SignalPriority.MEDIUM
        else:
            return SignalPriority.LOW

    async def add_risk_metrics(self, signal: TradingSignal, market_data: Dict, config: UserConfig) -> TradingSignal:
        """Add risk metrics to trading signal"""
        try:
            current_price = market_data.get("price", 0)
            volatility = market_data.get("volatility", 0.02)
            
            # Calculate stop loss and take profit
            if signal.action == SignalAction.BUY:
                signal.stop_loss = current_price * (1 - config.risk_settings.stop_loss_percentage)
                signal.take_profit = current_price * (1 + config.risk_settings.take_profit_percentage)
            elif signal.action == SignalAction.SELL:
                signal.stop_loss = current_price * (1 + config.risk_settings.stop_loss_percentage)
                signal.take_profit = current_price * (1 - config.risk_settings.take_profit_percentage)
            
            # Calculate risk-reward ratio
            if signal.stop_loss and signal.take_profit:
                risk = abs(current_price - signal.stop_loss)
                reward = abs(signal.take_profit - current_price)
                signal.risk_reward_ratio = reward / risk if risk > 0 else 0
            
            # Calculate position size based on risk
            signal.quantity = self.calculate_position_size(
                current_price, signal.stop_loss, config
            )
            
            # Calculate max loss and expected profit
            if signal.quantity:
                signal.max_loss = signal.quantity * abs(current_price - (signal.stop_loss or current_price))
                signal.expected_profit = signal.quantity * abs((signal.take_profit or current_price) - current_price)
            
        except Exception as e:
            logger.error(f"Risk metrics calculation error: {str(e)}")
        
        return signal

    def calculate_position_size(self, price: float, stop_loss: Optional[float], config: UserConfig) -> float:
        """Calculate position size based on risk management rules"""
        try:
            # Fixed percentage method
            if config.position_sizing_method == "fixed_percentage":
                max_position_value = 10000 * (config.risk_settings.max_trade_size_percent / 100)  # Assuming $10k portfolio
                return max_position_value / price
            
            # Risk-based sizing
            elif config.position_sizing_method == "risk_based" and stop_loss:
                risk_per_share = abs(price - stop_loss)
                max_risk = config.risk_settings.trade_sl
                return max_risk / risk_per_share if risk_per_share > 0 else 0
            
            # Default to small fixed amount
            return 100 / price  # $100 worth
            
        except Exception as e:
            logger.error(f"Position size calculation error: {str(e)}")
            return 0

    async def execute_signal(self, signal: TradingSignal):
        """Execute a trading signal"""
        try:
            logger.info(f"Executing signal: {signal.symbol} {signal.action} for user {signal.user_id}")
            
            # Here you would integrate with the backend API to execute the trade
            # For now, we'll just log and mark as executed
            
            signal.executed = True
            signal.executed_at = datetime.utcnow()
            
            # Update stats
            self.engine_stats["total_trades_executed"] += 1
            
            # Store signal for performance tracking
            await self.store_signal_history(signal)
            
        except Exception as e:
            logger.error(f"Signal execution error: {str(e)}")

    async def store_signal_history(self, signal: TradingSignal):
        """Store signal in history for performance tracking"""
        # This would typically store in database
        # For now, just log
        logger.info(f"Stored signal history: {signal.signal_id}")

    async def update_user_config(self, user_id: str, config_data: Dict[str, Any]):
        """Update user configuration"""
        try:
            if user_id not in self.user_configs:
                self.user_configs[user_id] = UserConfig(user_id=user_id)
            
            config = self.user_configs[user_id]
            
            # Update configuration
            if "trading_active" in config_data:
                config.trading_active = config_data["trading_active"]
                if config.trading_active:
                    self.active_users.add(user_id)
                else:
                    self.active_users.discard(user_id)
            
            if "enabled_coins" in config_data:
                config.enabled_coins = config_data["enabled_coins"]
            
            if "ai_strategies" in config_data:
                for strategy, enabled in config_data["ai_strategies"].items():
                    if hasattr(config.ai_strategies, strategy):
                        setattr(config.ai_strategies, strategy, enabled)
            
            if "risk_settings" in config_data:
                for setting, value in config_data["risk_settings"].items():
                    if hasattr(config.risk_settings, setting):
                        setattr(config.risk_settings, setting, value)
            
            config.updated_at = datetime.utcnow()
            config.last_active = datetime.utcnow()
            
            self.engine_stats["total_users_active"] = len(self.active_users)
            
            logger.info(f"Updated config for user {user_id}")
            
        except Exception as e:
            logger.error(f"Config update error for user {user_id}: {str(e)}")

    async def get_user_signals(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent signals for a user"""
        # This would typically query from database
        # For now, return empty list
        return []

    async def get_user_performance(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user performance metrics"""
        # This would typically calculate from stored data
        # For now, return mock data
        return {
            "total_trades": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0
        }

    async def emergency_stop(self):
        """Emergency stop all trading activities"""
        logger.warning("Emergency stop activated - stopping all trading")
        
        # Stop all active users
        for user_id in list(self.active_users):
            if user_id in self.user_configs:
                self.user_configs[user_id].trading_active = False
        
        self.active_users.clear()
        self.engine_stats["total_users_active"] = 0

    async def get_engine_stats(self) -> Dict[str, Any]:
        """Get AI engine statistics"""
        uptime = datetime.utcnow() - self.engine_stats["uptime_start"]
        
        return {
            **self.engine_stats,
            "uptime_seconds": uptime.total_seconds(),
            "analysis_running": self.analysis_running,
            "active_users_count": len(self.active_users)
        }

    async def analyze_market(self, market_data: Dict, strategies: Dict[str, bool], risk_settings: Dict) -> Dict[str, Any]:
        """Analyze market conditions"""
        try:
            analysis = {
                "market_sentiment": "neutral",
                "volatility_level": "medium",
                "trend_strength": 0.5,
                "volume_analysis": "normal",
                "support_resistance": {},
                "recommendations": []
            }
            
            # Add more sophisticated analysis here
            
            return analysis
            
        except Exception as e:
            logger.error(f"Market analysis error: {str(e)}")
            return {"error": str(e)}


"""
Strategy Manager
Manages all trading strategies and their execution
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

from models.trading_signal import TradingSignal, SignalAction, StrategySignal
from models.user_config import UserConfig, StrategyConfig
from strategies.volatility_scanner import VolatilityScanner
from strategies.sentiment_trigger import SentimentTrigger
from strategies.technical_strategies import TechnicalStrategies
from strategies.ml_strategies import MLStrategies

logger = logging.getLogger(__name__)

class StrategyManager:
    def __init__(self):
        # Initialize strategy instances
        self.strategies = {
            "volatility_scanner": VolatilityScanner(),
            "news_sentiment_trigger": SentimentTrigger(),
            "trailing_stop_loss": TechnicalStrategies(),
            "profit_optimizer": TechnicalStrategies(),
            "smart_entry_timing": TechnicalStrategies(),
            "multi_timeframe_analysis": TechnicalStrategies(),
            "ai_learning_feedback": MLStrategies(),
            "weekend_low_volume_mode": TechnicalStrategies(),
            "auto_rebalancer": TechnicalStrategies(),
            "auto_leverage_optimizer": TechnicalStrategies(),
            "option_chain_analysis": TechnicalStrategies(),
            "greeks_analysis": TechnicalStrategies(),
            "volume_spike_entry": TechnicalStrategies(),
            "high_rr_trade_filter": TechnicalStrategies(),
            "pre_trade_risk_analyzer": TechnicalStrategies(),
            "confidence_based_positioning": MLStrategies(),
            "capital_conservation_mode": TechnicalStrategies(),
            "auto_capital_increase": TechnicalStrategies()
        }
        
        # Strategy configurations per user
        self.user_strategy_configs: Dict[str, Dict[str, StrategyConfig]] = {}
        
        # Performance tracking
        self.strategy_performance: Dict[str, Dict[str, Any]] = {}

    async def generate_signals(self, user_id: str, market_data: Dict[str, Any], 
                             enabled_strategies: Dict[str, bool], 
                             market_analysis: Dict[str, Any]) -> List[TradingSignal]:
        """Generate trading signals based on enabled strategies"""
        
        signals = []
        
        try:
            # Get user strategy configs
            user_configs = self.user_strategy_configs.get(user_id, {})
            
            # Process each enabled strategy
            for strategy_name, enabled in enabled_strategies.items():
                if not enabled or strategy_name not in self.strategies:
                    continue
                
                try:
                    # Get strategy config
                    strategy_config = user_configs.get(strategy_name)
                    if not strategy_config:
                        strategy_config = StrategyConfig(strategy_name=strategy_name)
                        if user_id not in self.user_strategy_configs:
                            self.user_strategy_configs[user_id] = {}
                        self.user_strategy_configs[user_id][strategy_name] = strategy_config
                    
                    # Generate signals from strategy
                    strategy_signals = await self.strategies[strategy_name].generate_signals(
                        market_data, strategy_config, market_analysis
                    )
                    
                    # Convert strategy signals to trading signals
                    for strategy_signal in strategy_signals:
                        trading_signal = self.convert_to_trading_signal(
                            user_id, strategy_signal, market_data
                        )
                        if trading_signal:
                            signals.append(trading_signal)
                    
                    # Update strategy stats
                    strategy_config.total_signals += len(strategy_signals)
                    strategy_config.updated_at = datetime.utcnow()
                    
                except Exception as e:
                    logger.error(f"Strategy {strategy_name} error for user {user_id}: {str(e)}")
                    continue
            
            # Rank and filter signals
            signals = self.rank_signals(signals)
            
        except Exception as e:
            logger.error(f"Signal generation error for user {user_id}: {str(e)}")
        
        return signals

    def convert_to_trading_signal(self, user_id: str, strategy_signal: StrategySignal, 
                                market_data: Dict[str, Any]) -> Optional[TradingSignal]:
        """Convert strategy signal to trading signal"""
        
        try:
            symbol_data = market_data.get(strategy_signal.symbol, {})
            
            trading_signal = TradingSignal(
                user_id=user_id,
                symbol=strategy_signal.symbol,
                action=strategy_signal.action,
                confidence_score=strategy_signal.confidence,
                strategy_name=strategy_signal.strategy_name,
                reasoning=strategy_signal.reasoning,
                current_price=symbol_data.get("price", 0),
                market_trend=symbol_data.get("trend", "neutral"),
                volatility=symbol_data.get("volatility", 0),
                volume_ratio=symbol_data.get("volume_ratio", 1),
                metadata={
                    "indicators": strategy_signal.indicators,
                    "timestamp": strategy_signal.timestamp
                }
            )
            
            return trading_signal
            
        except Exception as e:
            logger.error(f"Signal conversion error: {str(e)}")
            return None

    def rank_signals(self, signals: List[TradingSignal]) -> List[TradingSignal]:
        """Rank signals by confidence and other factors"""
        
        try:
            # Sort by confidence score (descending)
            signals.sort(key=lambda x: x.confidence_score, reverse=True)
            
            # Apply additional ranking logic here
            # For example, prioritize certain strategies or symbols
            
            return signals
            
        except Exception as e:
            logger.error(f"Signal ranking error: {str(e)}")
            return signals

    async def toggle_strategy(self, user_id: str, strategy_name: str, enabled: bool):
        """Toggle a strategy for a user"""
        
        try:
            if user_id not in self.user_strategy_configs:
                self.user_strategy_configs[user_id] = {}
            
            if strategy_name not in self.user_strategy_configs[user_id]:
                self.user_strategy_configs[user_id][strategy_name] = StrategyConfig(
                    strategy_name=strategy_name
                )
            
            self.user_strategy_configs[user_id][strategy_name].enabled = enabled
            self.user_strategy_configs[user_id][strategy_name].updated_at = datetime.utcnow()
            
            logger.info(f"Strategy {strategy_name} {'enabled' if enabled else 'disabled'} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Strategy toggle error: {str(e)}")

    async def get_available_strategies(self) -> List[Dict[str, Any]]:
        """Get list of available strategies with descriptions"""
        
        strategies = [
            {
                "name": "volatility_scanner",
                "display_name": "AI Volatility Scanner",
                "description": "Scans for high volatility opportunities",
                "category": "Technical",
                "risk_level": "Medium"
            },
            {
                "name": "news_sentiment_trigger",
                "display_name": "News Sentiment Trigger",
                "description": "Trades based on news sentiment analysis",
                "category": "Fundamental",
                "risk_level": "High"
            },
            {
                "name": "trailing_stop_loss",
                "display_name": "Trailing Stop Loss",
                "description": "Dynamic stop loss management",
                "category": "Risk Management",
                "risk_level": "Low"
            },
            {
                "name": "profit_optimizer",
                "display_name": "Profit Optimizer Engine",
                "description": "Optimizes profit taking strategies",
                "category": "Technical",
                "risk_level": "Medium"
            },
            {
                "name": "smart_entry_timing",
                "display_name": "Smart Entry Timing Filter",
                "description": "Optimizes trade entry timing",
                "category": "Technical",
                "risk_level": "Medium"
            },
            {
                "name": "multi_timeframe_analysis",
                "display_name": "Multi-Timeframe Analysis",
                "description": "Analyzes multiple timeframes for confirmation",
                "category": "Technical",
                "risk_level": "Low"
            },
            {
                "name": "ai_learning_feedback",
                "display_name": "AI Learning Feedback Loop",
                "description": "Self-improving AI based on performance",
                "category": "Machine Learning",
                "risk_level": "Medium"
            },
            {
                "name": "weekend_low_volume_mode",
                "display_name": "Weekend Low Volume Mode",
                "description": "Adjusted strategy for low volume periods",
                "category": "Timing",
                "risk_level": "Low"
            },
            {
                "name": "auto_rebalancer",
                "display_name": "Auto Rebalancer (Weekly)",
                "description": "Automatically rebalances portfolio weekly",
                "category": "Portfolio Management",
                "risk_level": "Low"
            },
            {
                "name": "auto_leverage_optimizer",
                "display_name": "Auto Leverage Optimizer",
                "description": "Optimizes leverage based on market conditions",
                "category": "Risk Management",
                "risk_level": "High"
            },
            {
                "name": "option_chain_analysis",
                "display_name": "Option Chain Analysis",
                "description": "Analyzes options data for trading signals",
                "category": "Advanced",
                "risk_level": "High"
            },
            {
                "name": "greeks_analysis",
                "display_name": "Greeks Analysis (Delta, Gamma, Theta)",
                "description": "Options Greeks analysis for derivatives trading",
                "category": "Advanced",
                "risk_level": "High"
            },
            {
                "name": "volume_spike_entry",
                "display_name": "Volume Spike Entry Logic",
                "description": "Enters trades on volume spikes",
                "category": "Technical",
                "risk_level": "Medium"
            },
            {
                "name": "high_rr_trade_filter",
                "display_name": "High R:R Trade Filter",
                "description": "Filters trades by risk-reward ratio",
                "category": "Risk Management",
                "risk_level": "Low"
            },
            {
                "name": "pre_trade_risk_analyzer",
                "display_name": "Pre-trade Risk-to-Reward Analyzer",
                "description": "Analyzes risk before trade execution",
                "category": "Risk Management",
                "risk_level": "Low"
            },
            {
                "name": "confidence_based_positioning",
                "display_name": "Confidence-Based Position Sizing",
                "description": "Adjusts position size based on signal confidence",
                "category": "Position Management",
                "risk_level": "Medium"
            },
            {
                "name": "capital_conservation_mode",
                "display_name": "AI Capital Conservation Mode",
                "description": "Conserves capital during unfavorable conditions",
                "category": "Risk Management",
                "risk_level": "Low"
            },
            {
                "name": "auto_capital_increase",
                "display_name": "Auto Capital Increase on Profitable Streaks",
                "description": "Increases position size during winning streaks",
                "category": "Position Management",
                "risk_level": "High"
            }
        ]
        
        return strategies

    async def get_strategy_performance(self, user_id: str, strategy_name: str) -> Dict[str, Any]:
        """Get performance metrics for a specific strategy"""
        
        try:
            user_configs = self.user_strategy_configs.get(user_id, {})
            strategy_config = user_configs.get(strategy_name)
            
            if not strategy_config:
                return {"error": "Strategy not found"}
            
            return {
                "strategy_name": strategy_name,
                "total_signals": strategy_config.total_signals,
                "successful_signals": strategy_config.successful_signals,
                "success_rate": (strategy_config.successful_signals / strategy_config.total_signals * 100) if strategy_config.total_signals > 0 else 0,
                "total_pnl": strategy_config.total_pnl,
                "confidence_score": strategy_config.confidence_score,
                "enabled": strategy_config.enabled,
                "last_updated": strategy_config.updated_at
            }
            
        except Exception as e:
            logger.error(f"Get strategy performance error: {str(e)}")
            return {"error": str(e)}

    async def update_strategy_performance(self, user_id: str, strategy_name: str, 
                                        trade_result: Dict[str, Any]):
        """Update strategy performance based on trade result"""
        
        try:
            user_configs = self.user_strategy_configs.get(user_id, {})
            strategy_config = user_configs.get(strategy_name)
            
            if not strategy_config:
                return
            
            # Update performance metrics
            if trade_result.get("success", False):
                strategy_config.successful_signals += 1
                
                # Update confidence score (increase on success)
                strategy_config.confidence_score = min(95, 
                    strategy_config.confidence_score + (strategy_config.learning_rate * 10)
                )
            else:
                # Decrease confidence score on failure
                strategy_config.confidence_score = max(5,
                    strategy_config.confidence_score - (strategy_config.learning_rate * 5)
                )
            
            # Update PnL
            pnl = trade_result.get("pnl", 0)
            strategy_config.total_pnl += pnl
            
            strategy_config.updated_at = datetime.utcnow()
            
            logger.info(f"Updated performance for strategy {strategy_name}, user {user_id}")
            
        except Exception as e:
            logger.error(f"Update strategy performance error: {str(e)}")

    async def get_user_strategy_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of all strategies for a user"""
        
        try:
            user_configs = self.user_strategy_configs.get(user_id, {})
            
            summary = {
                "total_strategies": len(user_configs),
                "enabled_strategies": sum(1 for config in user_configs.values() if config.enabled),
                "total_signals": sum(config.total_signals for config in user_configs.values()),
                "total_pnl": sum(config.total_pnl for config in user_configs.values()),
                "strategies": []
            }
            
            for strategy_name, config in user_configs.items():
                strategy_summary = {
                    "name": strategy_name,
                    "enabled": config.enabled,
                    "confidence": config.confidence_score,
                    "signals": config.total_signals,
                    "success_rate": (config.successful_signals / config.total_signals * 100) if config.total_signals > 0 else 0,
                    "pnl": config.total_pnl
                }
                summary["strategies"].append(strategy_summary)
            
            return summary
            
        except Exception as e:
            logger.error(f"Get user strategy summary error: {str(e)}")
            return {"error": str(e)}


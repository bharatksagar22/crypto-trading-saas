"""
Advanced Trading Strategies with Confidence-based Execution
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConfidenceLevel(Enum):
    VERY_LOW = 0.1
    LOW = 0.3
    MEDIUM = 0.5
    HIGH = 0.7
    VERY_HIGH = 0.9

@dataclass
class TradingSignal:
    symbol: str
    action: str  # 'BUY', 'SELL', 'HOLD'
    confidence: float
    price: float
    quantity: float
    stop_loss: float
    take_profit: float
    reasoning: str
    timestamp: datetime
    strategy_name: str
    risk_reward_ratio: float

class AdvancedTradingStrategies:
    def __init__(self, config: Dict):
        self.config = config
        self.min_confidence = config.get('min_confidence', 0.6)
        self.max_position_size = config.get('max_position_size', 0.1)  # 10% of capital
        self.daily_loss_limit = config.get('daily_loss_limit', 1000)
        self.capital_conservation_mode = False
        self.daily_pnl = 0.0
        
    def calculate_confidence_score(self, 
                                 technical_score: float,
                                 sentiment_score: float,
                                 volume_score: float,
                                 volatility_score: float,
                                 news_score: float) -> float:
        """
        Calculate overall confidence score based on multiple factors
        """
        weights = {
            'technical': 0.3,
            'sentiment': 0.2,
            'volume': 0.2,
            'volatility': 0.15,
            'news': 0.15
        }
        
        confidence = (
            technical_score * weights['technical'] +
            sentiment_score * weights['sentiment'] +
            volume_score * weights['volume'] +
            volatility_score * weights['volatility'] +
            news_score * weights['news']
        )
        
        return min(max(confidence, 0.0), 1.0)
    
    def dynamic_position_sizing(self, confidence: float, capital: float) -> float:
        """
        Calculate position size based on confidence level and available capital
        """
        if self.capital_conservation_mode:
            base_size = 0.02  # 2% in conservation mode
        else:
            base_size = self.max_position_size
            
        # Scale position size by confidence
        confidence_multiplier = confidence ** 2  # Quadratic scaling
        position_size = base_size * confidence_multiplier
        
        # Apply capital conservation if daily loss limit is approached
        if abs(self.daily_pnl) > (self.daily_loss_limit * 0.8):
            position_size *= 0.5
            
        return min(position_size * capital, capital * self.max_position_size)
    
    def calculate_dynamic_stop_loss(self, 
                                  entry_price: float, 
                                  volatility: float, 
                                  confidence: float,
                                  action: str) -> float:
        """
        Calculate dynamic stop loss based on volatility and confidence
        """
        base_sl_percent = 0.02  # 2% base stop loss
        
        # Adjust based on volatility
        volatility_adjustment = min(volatility * 0.5, 0.05)  # Max 5% adjustment
        
        # Adjust based on confidence (higher confidence = tighter stop)
        confidence_adjustment = (1 - confidence) * 0.01
        
        total_sl_percent = base_sl_percent + volatility_adjustment + confidence_adjustment
        
        if action == 'BUY':
            return entry_price * (1 - total_sl_percent)
        else:  # SELL
            return entry_price * (1 + total_sl_percent)
    
    def calculate_dynamic_take_profit(self, 
                                    entry_price: float, 
                                    stop_loss: float, 
                                    confidence: float,
                                    action: str) -> float:
        """
        Calculate dynamic take profit based on risk-reward ratio and confidence
        """
        risk = abs(entry_price - stop_loss)
        
        # Base risk-reward ratio adjusted by confidence
        base_rr = 2.0
        confidence_bonus = confidence * 1.5  # Up to 1.5x bonus for high confidence
        target_rr = base_rr + confidence_bonus
        
        reward = risk * target_rr
        
        if action == 'BUY':
            return entry_price + reward
        else:  # SELL
            return entry_price - reward
    
    def momentum_strategy(self, market_data: Dict) -> Optional[TradingSignal]:
        """
        Momentum-based trading strategy with confidence scoring
        """
        try:
            symbol = market_data['symbol']
            price = market_data['price']
            volume = market_data['volume']
            volatility = market_data['volatility']
            
            # Technical indicators
            rsi = market_data.get('rsi', 50)
            macd = market_data.get('macd', 0)
            bb_position = market_data.get('bollinger_position', 0.5)
            
            # Calculate technical score
            technical_score = 0.0
            if rsi < 30:  # Oversold
                technical_score += 0.3
            elif rsi > 70:  # Overbought
                technical_score -= 0.3
                
            if macd > 0:  # Bullish momentum
                technical_score += 0.4
            else:  # Bearish momentum
                technical_score -= 0.4
                
            # Volume confirmation
            avg_volume = market_data.get('avg_volume', volume)
            volume_score = min(volume / avg_volume, 2.0) * 0.5
            
            # Sentiment and news scores (placeholder - would integrate with real APIs)
            sentiment_score = market_data.get('sentiment_score', 0.5)
            news_score = market_data.get('news_score', 0.5)
            volatility_score = min(1.0, max(0.0, 1.0 - volatility))
            
            # Calculate overall confidence
            confidence = self.calculate_confidence_score(
                abs(technical_score), sentiment_score, volume_score, 
                volatility_score, news_score
            )
            
            # Determine action
            action = 'HOLD'
            if technical_score > 0.3 and confidence > self.min_confidence:
                action = 'BUY'
            elif technical_score < -0.3 and confidence > self.min_confidence:
                action = 'SELL'
                
            if action == 'HOLD':
                return None
                
            # Calculate position size
            capital = market_data.get('available_capital', 10000)
            quantity = self.dynamic_position_sizing(confidence, capital) / price
            
            # Calculate stop loss and take profit
            stop_loss = self.calculate_dynamic_stop_loss(price, volatility, confidence, action)
            take_profit = self.calculate_dynamic_take_profit(price, stop_loss, confidence, action)
            
            risk_reward = abs(take_profit - price) / abs(price - stop_loss)
            
            return TradingSignal(
                symbol=symbol,
                action=action,
                confidence=confidence,
                price=price,
                quantity=quantity,
                stop_loss=stop_loss,
                take_profit=take_profit,
                reasoning=f"Momentum strategy: RSI={rsi:.1f}, MACD={macd:.3f}, Vol={volume_score:.2f}",
                timestamp=datetime.now(),
                strategy_name="momentum",
                risk_reward_ratio=risk_reward
            )
            
        except Exception as e:
            logger.error(f"Error in momentum strategy: {e}")
            return None
    
    def mean_reversion_strategy(self, market_data: Dict) -> Optional[TradingSignal]:
        """
        Mean reversion strategy with confidence scoring
        """
        try:
            symbol = market_data['symbol']
            price = market_data['price']
            
            # Bollinger Bands analysis
            bb_upper = market_data.get('bb_upper', price * 1.02)
            bb_lower = market_data.get('bb_lower', price * 0.98)
            bb_middle = market_data.get('bb_middle', price)
            
            # RSI for overbought/oversold conditions
            rsi = market_data.get('rsi', 50)
            
            # Calculate technical score for mean reversion
            technical_score = 0.0
            
            # Price position relative to Bollinger Bands
            if price > bb_upper:  # Above upper band - sell signal
                technical_score = -0.6
            elif price < bb_lower:  # Below lower band - buy signal
                technical_score = 0.6
            else:
                # Distance from middle band
                distance_from_middle = abs(price - bb_middle) / bb_middle
                if price > bb_middle:
                    technical_score = -distance_from_middle * 2
                else:
                    technical_score = distance_from_middle * 2
            
            # RSI confirmation
            if rsi > 80:  # Extremely overbought
                technical_score -= 0.3
            elif rsi < 20:  # Extremely oversold
                technical_score += 0.3
                
            # Other scores
            sentiment_score = market_data.get('sentiment_score', 0.5)
            volume_score = min(market_data.get('volume', 1000) / market_data.get('avg_volume', 1000), 2.0) * 0.5
            volatility = market_data.get('volatility', 0.02)
            volatility_score = min(volatility * 10, 1.0)  # Higher volatility favors mean reversion
            news_score = market_data.get('news_score', 0.5)
            
            confidence = self.calculate_confidence_score(
                abs(technical_score), sentiment_score, volume_score,
                volatility_score, news_score
            )
            
            # Determine action
            action = 'HOLD'
            if technical_score > 0.4 and confidence > self.min_confidence:
                action = 'BUY'
            elif technical_score < -0.4 and confidence > self.min_confidence:
                action = 'SELL'
                
            if action == 'HOLD':
                return None
                
            # Calculate position size and risk management
            capital = market_data.get('available_capital', 10000)
            quantity = self.dynamic_position_sizing(confidence, capital) / price
            
            stop_loss = self.calculate_dynamic_stop_loss(price, volatility, confidence, action)
            take_profit = self.calculate_dynamic_take_profit(price, stop_loss, confidence, action)
            
            risk_reward = abs(take_profit - price) / abs(price - stop_loss)
            
            return TradingSignal(
                symbol=symbol,
                action=action,
                confidence=confidence,
                price=price,
                quantity=quantity,
                stop_loss=stop_loss,
                take_profit=take_profit,
                reasoning=f"Mean reversion: BB_pos={((price-bb_lower)/(bb_upper-bb_lower)):.2f}, RSI={rsi:.1f}",
                timestamp=datetime.now(),
                strategy_name="mean_reversion",
                risk_reward_ratio=risk_reward
            )
            
        except Exception as e:
            logger.error(f"Error in mean reversion strategy: {e}")
            return None
    
    def breakout_strategy(self, market_data: Dict) -> Optional[TradingSignal]:
        """
        Breakout strategy with volume confirmation
        """
        try:
            symbol = market_data['symbol']
            price = market_data['price']
            volume = market_data['volume']
            
            # Support and resistance levels
            resistance = market_data.get('resistance', price * 1.05)
            support = market_data.get('support', price * 0.95)
            
            # Volume analysis
            avg_volume = market_data.get('avg_volume', volume)
            volume_ratio = volume / avg_volume
            
            # Technical score based on breakout
            technical_score = 0.0
            
            if price > resistance and volume_ratio > 1.5:  # Bullish breakout with volume
                technical_score = 0.7
            elif price < support and volume_ratio > 1.5:  # Bearish breakout with volume
                technical_score = -0.7
            else:
                return None  # No clear breakout
                
            # Volume score (higher is better for breakouts)
            volume_score = min(volume_ratio / 3.0, 1.0)
            
            # Other factors
            sentiment_score = market_data.get('sentiment_score', 0.5)
            volatility = market_data.get('volatility', 0.02)
            volatility_score = min(volatility * 5, 1.0)  # Moderate volatility preferred
            news_score = market_data.get('news_score', 0.5)
            
            confidence = self.calculate_confidence_score(
                abs(technical_score), sentiment_score, volume_score,
                volatility_score, news_score
            )
            
            # Determine action
            action = 'BUY' if technical_score > 0 else 'SELL'
            
            if confidence < self.min_confidence:
                return None
                
            # Position sizing and risk management
            capital = market_data.get('available_capital', 10000)
            quantity = self.dynamic_position_sizing(confidence, capital) / price
            
            stop_loss = self.calculate_dynamic_stop_loss(price, volatility, confidence, action)
            take_profit = self.calculate_dynamic_take_profit(price, stop_loss, confidence, action)
            
            risk_reward = abs(take_profit - price) / abs(price - stop_loss)
            
            return TradingSignal(
                symbol=symbol,
                action=action,
                confidence=confidence,
                price=price,
                quantity=quantity,
                stop_loss=stop_loss,
                take_profit=take_profit,
                reasoning=f"Breakout: Price={price:.2f}, Resistance={resistance:.2f}, Support={support:.2f}, Vol_ratio={volume_ratio:.1f}",
                timestamp=datetime.now(),
                strategy_name="breakout",
                risk_reward_ratio=risk_reward
            )
            
        except Exception as e:
            logger.error(f"Error in breakout strategy: {e}")
            return None
    
    def update_daily_pnl(self, pnl: float):
        """Update daily P&L and check for capital conservation mode"""
        self.daily_pnl += pnl
        
        if abs(self.daily_pnl) >= self.daily_loss_limit:
            self.capital_conservation_mode = True
            logger.warning(f"Daily loss limit reached: {self.daily_pnl}. Entering capital conservation mode.")
    
    def reset_daily_stats(self):
        """Reset daily statistics (call at start of new trading day)"""
        self.daily_pnl = 0.0
        self.capital_conservation_mode = False
        logger.info("Daily statistics reset.")


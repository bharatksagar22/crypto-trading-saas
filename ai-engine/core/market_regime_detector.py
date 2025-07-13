"""
Market Regime Detection Module
Detects bull/bear/sideways/volatile market conditions
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum

class MarketRegime(Enum):
    BULL = "bull"
    BEAR = "bear"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"

class MarketRegimeDetector:
    """
    Advanced Market Regime Detection using multiple indicators
    """
    
    def __init__(self):
        self.regime_history = []
        self.confidence_threshold = 0.7
        
    async def detect(self, market_data: Dict) -> MarketRegime:
        """
        Detect current market regime based on multiple factors
        """
        
        regime_scores = {
            MarketRegime.BULL: 0.0,
            MarketRegime.BEAR: 0.0,
            MarketRegime.SIDEWAYS: 0.0,
            MarketRegime.VOLATILE: 0.0
        }
        
        # Analyze each coin's contribution to overall regime
        for symbol, data in market_data.items():
            if symbol == 'regime':  # Skip regime key
                continue
                
            coin_regime = await self._analyze_coin_regime(data)
            
            # Weight by market cap or volume (simplified)
            weight = self._get_coin_weight(symbol)
            
            for regime in MarketRegime:
                regime_scores[regime] += coin_regime.get(regime, 0) * weight
        
        # Determine dominant regime
        dominant_regime = max(regime_scores, key=regime_scores.get)
        
        # Store in history
        self.regime_history.append({
            'timestamp': datetime.now(),
            'regime': dominant_regime,
            'scores': regime_scores
        })
        
        return dominant_regime
    
    async def _analyze_coin_regime(self, coin_data: Dict) -> Dict:
        """
        Analyze regime for individual coin
        """
        
        price_data = coin_data.get('price', {})
        volume_data = coin_data.get('volume', {})
        
        # Get price series (last 50 periods)
        prices = np.array(price_data.get('history', []))
        volumes = np.array(volume_data.get('history', []))
        
        if len(prices) < 20:
            return {MarketRegime.SIDEWAYS: 1.0}  # Default to sideways
        
        # 1. Trend Analysis
        trend_score = self._calculate_trend_score(prices)
        
        # 2. Volatility Analysis
        volatility_score = self._calculate_volatility_score(prices)
        
        # 3. Volume Analysis
        volume_score = self._calculate_volume_score(volumes)
        
        # 4. Technical Indicators
        tech_score = self._calculate_technical_score(prices)
        
        # Combine scores to determine regime
        regime_scores = {
            MarketRegime.BULL: 0.0,
            MarketRegime.BEAR: 0.0,
            MarketRegime.SIDEWAYS: 0.0,
            MarketRegime.VOLATILE: 0.0
        }
        
        # Bull market indicators
        if trend_score > 0.6 and volume_score > 0.5:
            regime_scores[MarketRegime.BULL] = 0.8
        
        # Bear market indicators
        elif trend_score < -0.6 and volume_score > 0.5:
            regime_scores[MarketRegime.BEAR] = 0.8
        
        # Volatile market indicators
        elif volatility_score > 0.7:
            regime_scores[MarketRegime.VOLATILE] = 0.9
        
        # Sideways market (default)
        else:
            regime_scores[MarketRegime.SIDEWAYS] = 0.7
        
        return regime_scores
    
    def _calculate_trend_score(self, prices: np.ndarray) -> float:
        """
        Calculate trend strength (-1 to 1)
        -1 = strong downtrend, 1 = strong uptrend
        """
        
        if len(prices) < 10:
            return 0.0
        
        # Linear regression slope
        x = np.arange(len(prices))
        slope, _ = np.polyfit(x, prices, 1)
        
        # Normalize slope
        price_range = np.max(prices) - np.min(prices)
        normalized_slope = slope / (price_range / len(prices))
        
        # Moving average trend
        ma_short = np.mean(prices[-5:])
        ma_long = np.mean(prices[-20:])
        ma_trend = (ma_short - ma_long) / ma_long
        
        # Combine indicators
        trend_score = (normalized_slope + ma_trend) / 2
        
        return np.clip(trend_score, -1, 1)
    
    def _calculate_volatility_score(self, prices: np.ndarray) -> float:
        """
        Calculate volatility score (0 to 1)
        0 = low volatility, 1 = high volatility
        """
        
        if len(prices) < 10:
            return 0.5
        
        # Calculate returns
        returns = np.diff(prices) / prices[:-1]
        
        # Standard deviation of returns
        volatility = np.std(returns)
        
        # Normalize (typical crypto volatility range)
        normalized_vol = volatility / 0.05  # 5% daily volatility as reference
        
        return np.clip(normalized_vol, 0, 1)
    
    def _calculate_volume_score(self, volumes: np.ndarray) -> float:
        """
        Calculate volume strength score (0 to 1)
        """
        
        if len(volumes) < 10:
            return 0.5
        
        # Recent volume vs average
        recent_volume = np.mean(volumes[-5:])
        avg_volume = np.mean(volumes)
        
        volume_ratio = recent_volume / avg_volume if avg_volume > 0 else 1
        
        # Normalize
        volume_score = min(volume_ratio / 2, 1.0)
        
        return volume_score
    
    def _calculate_technical_score(self, prices: np.ndarray) -> float:
        """
        Calculate technical indicator score using simple implementations
        """
        
        if len(prices) < 20:
            return 0.0
        
        scores = []
        
        try:
            # Simple RSI calculation
            rsi = self._calculate_rsi(prices, 14)
            if not np.isnan(rsi):
                if rsi > 70:
                    scores.append(-0.5)  # Overbought
                elif rsi < 30:
                    scores.append(0.5)   # Oversold
                else:
                    scores.append(0.0)
            
            # Simple MACD
            macd_line, signal_line = self._calculate_macd(prices)
            if not np.isnan(macd_line) and not np.isnan(signal_line):
                if macd_line > signal_line:
                    scores.append(0.3)   # Bullish
                else:
                    scores.append(-0.3)  # Bearish
            
            # Simple Bollinger Bands
            upper, lower = self._calculate_bollinger_bands(prices)
            if not np.isnan(upper) and not np.isnan(lower):
                current_price = prices[-1]
                if current_price > upper:
                    scores.append(-0.2)  # Overbought
                elif current_price < lower:
                    scores.append(0.2)   # Oversold
                else:
                    scores.append(0.0)
        
        except Exception:
            pass
        
        return np.mean(scores) if scores else 0.0
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> float:
        """Simple RSI calculation"""
        
        if len(prices) < period + 1:
            return 50.0
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_macd(self, prices: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9) -> tuple:
        """Simple MACD calculation"""
        
        if len(prices) < slow:
            return 0.0, 0.0
        
        # Exponential moving averages
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        macd_line = ema_fast - ema_slow
        
        # Signal line (EMA of MACD)
        if len(prices) >= slow + signal:
            macd_history = []
            for i in range(slow, len(prices)):
                ema_f = self._calculate_ema(prices[:i+1], fast)
                ema_s = self._calculate_ema(prices[:i+1], slow)
                macd_history.append(ema_f - ema_s)
            
            signal_line = self._calculate_ema(np.array(macd_history), signal)
        else:
            signal_line = macd_line
        
        return macd_line, signal_line
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> float:
        """Simple EMA calculation"""
        
        if len(prices) < period:
            return np.mean(prices)
        
        multiplier = 2 / (period + 1)
        ema = prices[0]
        
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def _calculate_bollinger_bands(self, prices: np.ndarray, period: int = 20, std_dev: float = 2.0) -> tuple:
        """Simple Bollinger Bands calculation"""
        
        if len(prices) < period:
            return np.nan, np.nan
        
        recent_prices = prices[-period:]
        middle = np.mean(recent_prices)
        std = np.std(recent_prices)
        
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return upper, lower
    
    def _get_coin_weight(self, symbol: str) -> float:
        """
        Get weight for coin in overall market regime calculation
        """
        
        # Simplified weighting based on market importance
        weights = {
            'BTCUSDT': 0.4,
            'ETHUSDT': 0.3,
            'ADAUSDT': 0.1,
            'BNBUSDT': 0.1,
            'SOLUSDT': 0.1
        }
        
        return weights.get(symbol, 0.05)  # Default small weight
    
    async def get_current_regime(self) -> MarketRegime:
        """
        Get the most recent market regime
        """
        
        if self.regime_history:
            return self.regime_history[-1]['regime']
        
        return MarketRegime.SIDEWAYS  # Default
    
    def get_regime_confidence(self) -> float:
        """
        Get confidence in current regime detection
        """
        
        if not self.regime_history:
            return 0.5
        
        latest = self.regime_history[-1]
        scores = latest['scores']
        
        # Calculate confidence as difference between top two scores
        sorted_scores = sorted(scores.values(), reverse=True)
        if len(sorted_scores) >= 2:
            confidence = sorted_scores[0] - sorted_scores[1]
        else:
            confidence = sorted_scores[0] if sorted_scores else 0.5
        
        return min(confidence, 1.0)
    
    def get_regime_stability(self, lookback_periods: int = 10) -> float:
        """
        Get stability of regime over recent periods
        """
        
        if len(self.regime_history) < lookback_periods:
            return 0.5
        
        recent_regimes = [entry['regime'] for entry in self.regime_history[-lookback_periods:]]
        
        # Calculate stability as consistency of regime
        most_common = max(set(recent_regimes), key=recent_regimes.count)
        stability = recent_regimes.count(most_common) / len(recent_regimes)
        
        return stability


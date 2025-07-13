"""
Strategy Engine Module
Generates and manages trading strategies
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

class StrategyType(Enum):
    MOMENTUM = "momentum"
    MEAN_REVERSION = "mean_reversion"
    BREAKOUT = "breakout"
    SCALPING = "scalping"
    SWING = "swing"

class StrategyEngine:
    """
    Advanced Strategy Generation Engine
    """
    
    def __init__(self):
        self.strategy_performance = {}
        
    async def generate_strategies(self, market_data: Dict) -> List[Dict]:
        """
        Generate trading strategies based on market conditions
        """
        
        strategies = []
        
        for symbol, data in market_data.items():
            if symbol == 'regime':
                continue
                
            # Generate different strategy types
            momentum_strategy = await self._generate_momentum_strategy(symbol, data)
            if momentum_strategy:
                strategies.append(momentum_strategy)
                
            mean_reversion_strategy = await self._generate_mean_reversion_strategy(symbol, data)
            if mean_reversion_strategy:
                strategies.append(mean_reversion_strategy)
                
            breakout_strategy = await self._generate_breakout_strategy(symbol, data)
            if breakout_strategy:
                strategies.append(breakout_strategy)
        
        return strategies
    
    async def _generate_momentum_strategy(self, symbol: str, data: Dict) -> Optional[Dict]:
        """Generate momentum-based strategy"""
        
        price_data = data.get('price', {})
        volume_data = data.get('volume', {})
        
        current_price = price_data.get('current', 0)
        price_history = price_data.get('history', [])
        
        if len(price_history) < 10:
            return None
        
        # Calculate momentum indicators
        short_ma = np.mean(price_history[-5:])
        long_ma = np.mean(price_history[-20:])
        
        momentum_score = (short_ma - long_ma) / long_ma
        
        if momentum_score > 0.02:  # 2% momentum threshold
            return {
                'name': 'momentum_strategy',
                'type': StrategyType.MOMENTUM,
                'symbol': symbol,
                'action': 'BUY',
                'stop_loss': current_price * 0.98,
                'take_profit': current_price * 1.04,
                'risk_level': 'medium',
                'reasoning': f'Strong upward momentum detected: {momentum_score:.3f}',
                'risk_reward_ratio': 2.0,
                'expected_duration': 60  # minutes
            }
        elif momentum_score < -0.02:
            return {
                'name': 'momentum_strategy',
                'type': StrategyType.MOMENTUM,
                'symbol': symbol,
                'action': 'SELL',
                'stop_loss': current_price * 1.02,
                'take_profit': current_price * 0.96,
                'risk_level': 'medium',
                'reasoning': f'Strong downward momentum detected: {momentum_score:.3f}',
                'risk_reward_ratio': 2.0,
                'expected_duration': 60
            }
        
        return None
    
    async def _generate_mean_reversion_strategy(self, symbol: str, data: Dict) -> Optional[Dict]:
        """Generate mean reversion strategy"""
        
        price_data = data.get('price', {})
        current_price = price_data.get('current', 0)
        price_history = price_data.get('history', [])
        
        if len(price_history) < 20:
            return None
        
        # Calculate Bollinger Bands
        prices = np.array(price_history)
        mean_price = np.mean(prices[-20:])
        std_price = np.std(prices[-20:])
        
        upper_band = mean_price + (2 * std_price)
        lower_band = mean_price - (2 * std_price)
        
        # Mean reversion signals
        if current_price > upper_band:
            return {
                'name': 'mean_reversion_strategy',
                'type': StrategyType.MEAN_REVERSION,
                'symbol': symbol,
                'action': 'SELL',
                'stop_loss': current_price * 1.015,
                'take_profit': mean_price,
                'risk_level': 'low',
                'reasoning': f'Price above upper Bollinger Band: {current_price:.2f} > {upper_band:.2f}',
                'risk_reward_ratio': 1.5,
                'expected_duration': 30
            }
        elif current_price < lower_band:
            return {
                'name': 'mean_reversion_strategy',
                'type': StrategyType.MEAN_REVERSION,
                'symbol': symbol,
                'action': 'BUY',
                'stop_loss': current_price * 0.985,
                'take_profit': mean_price,
                'risk_level': 'low',
                'reasoning': f'Price below lower Bollinger Band: {current_price:.2f} < {lower_band:.2f}',
                'risk_reward_ratio': 1.5,
                'expected_duration': 30
            }
        
        return None
    
    async def _generate_breakout_strategy(self, symbol: str, data: Dict) -> Optional[Dict]:
        """Generate breakout strategy"""
        
        price_data = data.get('price', {})
        volume_data = data.get('volume', {})
        
        current_price = price_data.get('current', 0)
        price_history = price_data.get('history', [])
        volume_ratio = volume_data.get('volume_ratio', 1.0)
        
        if len(price_history) < 20:
            return None
        
        # Calculate support and resistance levels
        prices = np.array(price_history[-20:])
        resistance = np.max(prices)
        support = np.min(prices)
        
        # Breakout conditions
        if current_price > resistance * 1.005 and volume_ratio > 1.5:
            return {
                'name': 'breakout_strategy',
                'type': StrategyType.BREAKOUT,
                'symbol': symbol,
                'action': 'BUY',
                'stop_loss': resistance * 0.995,
                'take_profit': current_price * 1.03,
                'risk_level': 'high',
                'reasoning': f'Breakout above resistance {resistance:.2f} with high volume',
                'risk_reward_ratio': 3.0,
                'expected_duration': 120
            }
        elif current_price < support * 0.995 and volume_ratio > 1.5:
            return {
                'name': 'breakout_strategy',
                'type': StrategyType.BREAKOUT,
                'symbol': symbol,
                'action': 'SELL',
                'stop_loss': support * 1.005,
                'take_profit': current_price * 0.97,
                'risk_level': 'high',
                'reasoning': f'Breakdown below support {support:.2f} with high volume',
                'risk_reward_ratio': 3.0,
                'expected_duration': 120
            }
        
        return None
    
    def update_strategy_performance(self, strategy_name: str, performance_data: Dict):
        """Update strategy performance metrics"""
        
        if strategy_name not in self.strategy_performance:
            self.strategy_performance[strategy_name] = {
                'total_trades': 0,
                'winning_trades': 0,
                'total_profit': 0.0,
                'avg_duration': 0.0,
                'sharpe_ratio': 0.0
            }
        
        metrics = self.strategy_performance[strategy_name]
        metrics['total_trades'] += 1
        
        if performance_data.get('profit', 0) > 0:
            metrics['winning_trades'] += 1
        
        metrics['total_profit'] += performance_data.get('profit', 0)
        
        # Update averages
        metrics['win_rate'] = metrics['winning_trades'] / metrics['total_trades']
        metrics['avg_profit'] = metrics['total_profit'] / metrics['total_trades']
    
    def get_strategy_ranking(self) -> List[str]:
        """Get strategies ranked by performance"""
        
        if not self.strategy_performance:
            return ['momentum_strategy', 'mean_reversion_strategy', 'breakout_strategy']
        
        # Rank by win rate and profit
        ranked = sorted(
            self.strategy_performance.items(),
            key=lambda x: (x[1].get('win_rate', 0) * x[1].get('avg_profit', 0)),
            reverse=True
        )
        
        return [strategy[0] for strategy in ranked]


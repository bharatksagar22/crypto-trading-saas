"""
Self-Improving Learning Engine
Implements reinforcement learning and continuous improvement
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import pickle
from dataclasses import dataclass
from collections import deque
import logging

@dataclass
class TradeOutcome:
    trade_id: str
    strategy: str
    symbol: str
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    quantity: float
    profit_loss: float
    confidence: float
    market_conditions: Dict
    success: bool

@dataclass
class LearningMetrics:
    strategy_performance: Dict
    market_pattern_recognition: Dict
    confidence_accuracy: Dict
    risk_management_effectiveness: Dict
    overall_performance: Dict

class LearningEngine:
    """
    Advanced Self-Learning Engine with Reinforcement Learning
    
    Continuously improves AI Agent performance through:
    - Strategy performance analysis
    - Market pattern recognition
    - Confidence calibration
    - Risk parameter optimization
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Learning data storage
        self.trade_outcomes = deque(maxlen=1000)  # Last 1000 trades
        self.strategy_metrics = {}
        self.market_patterns = {}
        self.confidence_calibration = {}
        
        # Performance tracking
        self.performance_history = []
        self.learning_rate = 0.1
        self.exploration_rate = 0.1
        
        # Reinforcement learning components
        self.q_table = {}  # State-action values
        self.state_history = deque(maxlen=100)
        self.action_history = deque(maxlen=100)
        self.reward_history = deque(maxlen=100)
        
        # Load previous learning data
        self._load_learning_state()
        
        self.logger.info("🧠 Learning Engine initialized")
    
    async def record_trade_outcome(self, trade_outcome: TradeOutcome):
        """Record a completed trade for learning"""
        
        self.trade_outcomes.append(trade_outcome)
        
        # Update strategy performance
        await self._update_strategy_performance(trade_outcome)
        
        # Update market pattern recognition
        await self._update_market_patterns(trade_outcome)
        
        # Update confidence calibration
        await self._update_confidence_calibration(trade_outcome)
        
        # Perform reinforcement learning update
        await self._reinforcement_learning_update(trade_outcome)
        
        # Save learning state
        self._save_learning_state()
        
        self.logger.info(f"📚 Recorded trade outcome: {trade_outcome.trade_id}")
    
    async def _update_strategy_performance(self, outcome: TradeOutcome):
        """Update strategy performance metrics"""
        
        strategy = outcome.strategy
        
        if strategy not in self.strategy_metrics:
            self.strategy_metrics[strategy] = {
                'total_trades': 0,
                'profitable_trades': 0,
                'total_profit': 0.0,
                'total_loss': 0.0,
                'avg_profit': 0.0,
                'avg_loss': 0.0,
                'win_rate': 0.0,
                'profit_factor': 0.0,
                'sharpe_ratio': 0.0,
                'max_drawdown': 0.0,
                'avg_holding_time': 0.0,
                'confidence_accuracy': 0.0,
                'market_regime_performance': {},
                'recent_performance': deque(maxlen=20)
            }
        
        metrics = self.strategy_metrics[strategy]
        
        # Update basic metrics
        metrics['total_trades'] += 1
        
        if outcome.success:
            metrics['profitable_trades'] += 1
            metrics['total_profit'] += outcome.profit_loss
        else:
            metrics['total_loss'] += abs(outcome.profit_loss)
        
        # Calculate derived metrics
        metrics['win_rate'] = metrics['profitable_trades'] / metrics['total_trades']
        
        if metrics['total_loss'] > 0:
            metrics['profit_factor'] = metrics['total_profit'] / metrics['total_loss']
        
        # Update average profit/loss
        profitable_trades = [t for t in self.trade_outcomes 
                           if t.strategy == strategy and t.success]
        losing_trades = [t for t in self.trade_outcomes 
                        if t.strategy == strategy and not t.success]
        
        if profitable_trades:
            metrics['avg_profit'] = np.mean([t.profit_loss for t in profitable_trades])
        
        if losing_trades:
            metrics['avg_loss'] = np.mean([abs(t.profit_loss) for t in losing_trades])
        
        # Calculate Sharpe ratio
        returns = [t.profit_loss for t in self.trade_outcomes if t.strategy == strategy]
        if len(returns) > 5:
            metrics['sharpe_ratio'] = self._calculate_sharpe_ratio(returns)
        
        # Update holding time
        holding_time = (outcome.exit_time - outcome.entry_time).total_seconds() / 60
        metrics['avg_holding_time'] = (
            (metrics['avg_holding_time'] * (metrics['total_trades'] - 1) + holding_time) 
            / metrics['total_trades']
        )
        
        # Update market regime performance
        regime = outcome.market_conditions.get('regime', 'unknown')
        if regime not in metrics['market_regime_performance']:
            metrics['market_regime_performance'][regime] = {
                'trades': 0, 'wins': 0, 'profit': 0.0
            }
        
        regime_perf = metrics['market_regime_performance'][regime]
        regime_perf['trades'] += 1
        regime_perf['profit'] += outcome.profit_loss
        if outcome.success:
            regime_perf['wins'] += 1
        
        # Add to recent performance
        metrics['recent_performance'].append({
            'timestamp': outcome.exit_time,
            'profit': outcome.profit_loss,
            'success': outcome.success,
            'confidence': outcome.confidence
        })
    
    async def _update_market_patterns(self, outcome: TradeOutcome):
        """Update market pattern recognition"""
        
        conditions = outcome.market_conditions
        
        # Create pattern key
        pattern_key = self._create_pattern_key(conditions)
        
        if pattern_key not in self.market_patterns:
            self.market_patterns[pattern_key] = {
                'occurrences': 0,
                'successful_trades': 0,
                'total_profit': 0.0,
                'best_strategies': {},
                'avg_confidence': 0.0
            }
        
        pattern = self.market_patterns[pattern_key]
        pattern['occurrences'] += 1
        pattern['total_profit'] += outcome.profit_loss
        
        if outcome.success:
            pattern['successful_trades'] += 1
        
        # Update best strategies for this pattern
        strategy = outcome.strategy
        if strategy not in pattern['best_strategies']:
            pattern['best_strategies'][strategy] = {
                'trades': 0, 'wins': 0, 'profit': 0.0
            }
        
        strat_perf = pattern['best_strategies'][strategy]
        strat_perf['trades'] += 1
        strat_perf['profit'] += outcome.profit_loss
        if outcome.success:
            strat_perf['wins'] += 1
        
        # Update average confidence
        pattern['avg_confidence'] = (
            (pattern['avg_confidence'] * (pattern['occurrences'] - 1) + outcome.confidence)
            / pattern['occurrences']
        )
    
    async def _update_confidence_calibration(self, outcome: TradeOutcome):
        """Update confidence calibration accuracy"""
        
        confidence_bucket = int(outcome.confidence // 10) * 10  # 0-10, 10-20, etc.
        
        if confidence_bucket not in self.confidence_calibration:
            self.confidence_calibration[confidence_bucket] = {
                'predictions': 0,
                'successes': 0,
                'actual_success_rate': 0.0,
                'calibration_error': 0.0
            }
        
        calib = self.confidence_calibration[confidence_bucket]
        calib['predictions'] += 1
        
        if outcome.success:
            calib['successes'] += 1
        
        calib['actual_success_rate'] = calib['successes'] / calib['predictions']
        
        # Calculate calibration error
        predicted_rate = confidence_bucket / 100.0
        calib['calibration_error'] = abs(calib['actual_success_rate'] - predicted_rate)
    
    async def _reinforcement_learning_update(self, outcome: TradeOutcome):
        """Update reinforcement learning model"""
        
        # Define state representation
        state = self._encode_state(outcome.market_conditions)
        action = self._encode_action(outcome.strategy, outcome.confidence)
        
        # Calculate reward
        reward = self._calculate_reward(outcome)
        
        # Update Q-table
        state_key = str(state)
        action_key = str(action)
        
        if state_key not in self.q_table:
            self.q_table[state_key] = {}
        
        if action_key not in self.q_table[state_key]:
            self.q_table[state_key][action_key] = 0.0
        
        # Q-learning update
        old_value = self.q_table[state_key][action_key]
        
        # Get max Q-value for next state (if available)
        next_state_key = str(self._encode_state(outcome.market_conditions))
        max_next_q = 0.0
        if next_state_key in self.q_table:
            max_next_q = max(self.q_table[next_state_key].values()) if self.q_table[next_state_key] else 0.0
        
        # Update Q-value
        new_value = old_value + self.learning_rate * (reward + 0.9 * max_next_q - old_value)
        self.q_table[state_key][action_key] = new_value
        
        # Store for history
        self.state_history.append(state)
        self.action_history.append(action)
        self.reward_history.append(reward)
    
    def _create_pattern_key(self, conditions: Dict) -> str:
        """Create a key for market pattern recognition"""
        
        # Discretize continuous values
        volatility = conditions.get('volatility', 0.5)
        volume_ratio = conditions.get('volume_ratio', 1.0)
        sentiment = conditions.get('sentiment_score', 0.5)
        
        vol_bucket = int(volatility * 10)  # 0-10
        volume_bucket = int(min(volume_ratio, 3.0) * 10)  # 0-30
        sentiment_bucket = int(sentiment * 10)  # 0-10
        
        regime = conditions.get('regime', 'unknown')
        hour = conditions.get('hour', 12)
        
        return f"{regime}_{vol_bucket}_{volume_bucket}_{sentiment_bucket}_{hour//4}"
    
    def _encode_state(self, conditions: Dict) -> List[float]:
        """Encode market conditions as state vector"""
        
        state = [
            conditions.get('volatility', 0.5),
            conditions.get('volume_ratio', 1.0),
            conditions.get('sentiment_score', 0.5),
            1.0 if conditions.get('regime') == 'bull' else 0.0,
            1.0 if conditions.get('regime') == 'bear' else 0.0,
            1.0 if conditions.get('regime') == 'volatile' else 0.0,
            conditions.get('hour', 12) / 24.0,
            conditions.get('price_trend', 0.0)
        ]
        
        return state
    
    def _encode_action(self, strategy: str, confidence: float) -> List[float]:
        """Encode strategy and confidence as action vector"""
        
        # Strategy encoding
        strategy_encoding = {
            'momentum': [1, 0, 0, 0],
            'mean_reversion': [0, 1, 0, 0],
            'breakout': [0, 0, 1, 0],
            'scalping': [0, 0, 0, 1]
        }
        
        strategy_vector = strategy_encoding.get(strategy, [0, 0, 0, 0])
        confidence_normalized = confidence / 100.0
        
        return strategy_vector + [confidence_normalized]
    
    def _calculate_reward(self, outcome: TradeOutcome) -> float:
        """Calculate reward for reinforcement learning"""
        
        # Base reward from profit/loss
        profit_reward = outcome.profit_loss / 100.0  # Normalize
        
        # Confidence accuracy bonus
        confidence_accuracy = 1.0 if outcome.success else -1.0
        confidence_bonus = confidence_accuracy * (outcome.confidence / 100.0) * 0.5
        
        # Risk-adjusted reward
        holding_time_hours = (outcome.exit_time - outcome.entry_time).total_seconds() / 3600
        time_penalty = -0.1 * max(0, holding_time_hours - 24)  # Penalty for holding > 24h
        
        total_reward = profit_reward + confidence_bonus + time_penalty
        
        return np.clip(total_reward, -10, 10)  # Clip to reasonable range
    
    def _calculate_sharpe_ratio(self, returns: List[float]) -> float:
        """Calculate Sharpe ratio for strategy performance"""
        
        if len(returns) < 5:
            return 0.0
        
        returns_array = np.array(returns)
        mean_return = np.mean(returns_array)
        std_return = np.std(returns_array)
        
        if std_return == 0:
            return 0.0
        
        # Assuming risk-free rate of 0 for simplicity
        sharpe = mean_return / std_return
        
        return sharpe
    
    async def get_strategy_recommendations(self, market_conditions: Dict) -> List[Dict]:
        """Get strategy recommendations based on learning"""
        
        recommendations = []
        
        # Get pattern-based recommendations
        pattern_key = self._create_pattern_key(market_conditions)
        
        if pattern_key in self.market_patterns:
            pattern = self.market_patterns[pattern_key]
            
            # Sort strategies by performance in this pattern
            sorted_strategies = sorted(
                pattern['best_strategies'].items(),
                key=lambda x: x[1]['profit'] / max(x[1]['trades'], 1),
                reverse=True
            )
            
            for strategy_name, perf in sorted_strategies[:3]:  # Top 3
                if perf['trades'] >= 3:  # Minimum sample size
                    win_rate = perf['wins'] / perf['trades']
                    avg_profit = perf['profit'] / perf['trades']
                    
                    recommendations.append({
                        'strategy': strategy_name,
                        'confidence_adjustment': win_rate * 20,  # Boost confidence
                        'expected_profit': avg_profit,
                        'sample_size': perf['trades'],
                        'reason': f'Strong performance in similar market conditions'
                    })
        
        # Get Q-learning recommendations
        state = self._encode_state(market_conditions)
        state_key = str(state)
        
        if state_key in self.q_table:
            # Sort actions by Q-value
            sorted_actions = sorted(
                self.q_table[state_key].items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            for action_key, q_value in sorted_actions[:2]:  # Top 2
                if q_value > 0:  # Only positive Q-values
                    recommendations.append({
                        'strategy': 'rl_recommended',
                        'confidence_adjustment': q_value * 10,
                        'q_value': q_value,
                        'reason': 'Reinforcement learning recommendation'
                    })
        
        return recommendations
    
    async def get_confidence_adjustment(self, strategy: str, 
                                      base_confidence: float,
                                      market_conditions: Dict) -> float:
        """Get confidence adjustment based on learning"""
        
        adjustment = 0.0
        
        # Strategy performance adjustment
        if strategy in self.strategy_metrics:
            metrics = self.strategy_metrics[strategy]
            
            # Recent performance weight
            recent_trades = list(metrics['recent_performance'])
            if len(recent_trades) >= 5:
                recent_win_rate = sum(1 for t in recent_trades if t['success']) / len(recent_trades)
                recent_avg_profit = np.mean([t['profit'] for t in recent_trades])
                
                # Adjust based on recent performance
                if recent_win_rate > 0.6 and recent_avg_profit > 0:
                    adjustment += 10
                elif recent_win_rate < 0.4 or recent_avg_profit < 0:
                    adjustment -= 10
            
            # Market regime adjustment
            regime = market_conditions.get('regime', 'unknown')
            if regime in metrics['market_regime_performance']:
                regime_perf = metrics['market_regime_performance'][regime]
                if regime_perf['trades'] >= 3:
                    regime_win_rate = regime_perf['wins'] / regime_perf['trades']
                    if regime_win_rate > 0.6:
                        adjustment += 5
                    elif regime_win_rate < 0.4:
                        adjustment -= 5
        
        # Confidence calibration adjustment
        confidence_bucket = int(base_confidence // 10) * 10
        if confidence_bucket in self.confidence_calibration:
            calib = self.confidence_calibration[confidence_bucket]
            if calib['predictions'] >= 10:  # Sufficient sample size
                # Adjust if confidence is consistently over/under-estimated
                if calib['calibration_error'] > 0.2:
                    if calib['actual_success_rate'] < confidence_bucket / 100.0:
                        adjustment -= 10  # Over-confident
                    else:
                        adjustment += 5   # Under-confident
        
        return np.clip(adjustment, -20, 20)
    
    def get_learning_metrics(self) -> LearningMetrics:
        """Get comprehensive learning metrics"""
        
        # Strategy performance summary
        strategy_summary = {}
        for strategy, metrics in self.strategy_metrics.items():
            strategy_summary[strategy] = {
                'win_rate': metrics['win_rate'],
                'profit_factor': metrics['profit_factor'],
                'sharpe_ratio': metrics['sharpe_ratio'],
                'total_trades': metrics['total_trades'],
                'avg_profit': metrics['avg_profit']
            }
        
        # Market pattern recognition summary
        pattern_summary = {}
        for pattern, data in self.market_patterns.items():
            if data['occurrences'] >= 5:  # Only patterns with sufficient data
                success_rate = data['successful_trades'] / data['occurrences']
                pattern_summary[pattern] = {
                    'success_rate': success_rate,
                    'occurrences': data['occurrences'],
                    'avg_profit': data['total_profit'] / data['occurrences']
                }
        
        # Confidence calibration summary
        confidence_summary = {}
        for bucket, data in self.confidence_calibration.items():
            if data['predictions'] >= 5:
                confidence_summary[f"{bucket}-{bucket+10}%"] = {
                    'predicted_rate': bucket / 100.0,
                    'actual_rate': data['actual_success_rate'],
                    'calibration_error': data['calibration_error'],
                    'sample_size': data['predictions']
                }
        
        # Overall performance
        if self.trade_outcomes:
            total_profit = sum(t.profit_loss for t in self.trade_outcomes)
            total_trades = len(self.trade_outcomes)
            winning_trades = sum(1 for t in self.trade_outcomes if t.success)
            
            overall_performance = {
                'total_trades': total_trades,
                'win_rate': winning_trades / total_trades,
                'total_profit': total_profit,
                'avg_profit_per_trade': total_profit / total_trades,
                'learning_samples': len(self.trade_outcomes)
            }
        else:
            overall_performance = {}
        
        return LearningMetrics(
            strategy_performance=strategy_summary,
            market_pattern_recognition=pattern_summary,
            confidence_accuracy=confidence_summary,
            risk_management_effectiveness={},  # TODO: Implement
            overall_performance=overall_performance
        )
    
    def _save_learning_state(self):
        """Save learning state to disk"""
        
        try:
            learning_data = {
                'strategy_metrics': self.strategy_metrics,
                'market_patterns': self.market_patterns,
                'confidence_calibration': self.confidence_calibration,
                'q_table': self.q_table,
                'last_updated': datetime.now().isoformat()
            }
            
            with open('learning_state.pkl', 'wb') as f:
                pickle.dump(learning_data, f)
                
        except Exception as e:
            self.logger.error(f"Error saving learning state: {e}")
    
    def _load_learning_state(self):
        """Load learning state from disk"""
        
        try:
            with open('learning_state.pkl', 'rb') as f:
                learning_data = pickle.load(f)
                
            self.strategy_metrics = learning_data.get('strategy_metrics', {})
            self.market_patterns = learning_data.get('market_patterns', {})
            self.confidence_calibration = learning_data.get('confidence_calibration', {})
            self.q_table = learning_data.get('q_table', {})
            
            self.logger.info("📚 Loaded learning state from disk")
            
        except FileNotFoundError:
            self.logger.info("No previous learning state found, starting fresh")
        except Exception as e:
            self.logger.error(f"Error loading learning state: {e}")
    
    async def reset_learning(self):
        """Reset all learning data (use with caution)"""
        
        self.strategy_metrics = {}
        self.market_patterns = {}
        self.confidence_calibration = {}
        self.q_table = {}
        self.trade_outcomes.clear()
        
        self.logger.warning("🔄 Learning data has been reset")


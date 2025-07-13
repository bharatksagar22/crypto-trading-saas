"""
Self-Learning AI Module with Feedback Loop
"""

import numpy as np
import pandas as pd
import json
import pickle
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score
import joblib
import os

logger = logging.getLogger(__name__)

@dataclass
class TradeOutcome:
    trade_id: str
    symbol: str
    action: str
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    pnl_percentage: float
    duration_minutes: int
    strategy_name: str
    confidence_score: float
    market_conditions: Dict
    technical_indicators: Dict
    sentiment_data: Dict
    volume_data: Dict
    volatility_data: Dict
    timestamp: datetime
    success: bool  # True if profitable, False if loss

@dataclass
class LearningMetrics:
    total_trades: int
    successful_trades: int
    win_rate: float
    avg_pnl: float
    avg_confidence: float
    strategy_performance: Dict
    market_condition_performance: Dict
    confidence_accuracy: Dict
    last_updated: datetime

class SelfLearningModule:
    def __init__(self, config: Dict):
        self.config = config
        self.model_path = config.get('model_path', '/tmp/trading_models')
        self.data_path = config.get('data_path', '/tmp/trading_data')
        self.min_trades_for_learning = config.get('min_trades_for_learning', 50)
        self.retrain_frequency_hours = config.get('retrain_frequency_hours', 24)
        
        # Create directories
        os.makedirs(self.model_path, exist_ok=True)
        os.makedirs(self.data_path, exist_ok=True)
        
        # Initialize models
        self.confidence_model = None
        self.strategy_selector_model = None
        self.risk_model = None
        self.scaler = StandardScaler()
        
        # Load existing data and models
        self.trade_history = self.load_trade_history()
        self.learning_metrics = self.load_learning_metrics()
        self.load_models()
        
    def record_trade_outcome(self, trade_outcome: TradeOutcome):
        """
        Record a completed trade outcome for learning
        """
        try:
            # Add to trade history
            self.trade_history.append(trade_outcome)
            
            # Save to persistent storage
            self.save_trade_history()
            
            # Update learning metrics
            self.update_learning_metrics()
            
            # Check if we should retrain models
            if self.should_retrain():
                self.retrain_models()
                
            logger.info(f"Recorded trade outcome: {trade_outcome.trade_id}, PnL: {trade_outcome.pnl:.2f}")
            
        except Exception as e:
            logger.error(f"Error recording trade outcome: {e}")
    
    def predict_trade_success_probability(self, 
                                        strategy_name: str,
                                        market_conditions: Dict,
                                        technical_indicators: Dict,
                                        sentiment_data: Dict,
                                        volume_data: Dict,
                                        volatility_data: Dict) -> float:
        """
        Predict the probability of trade success based on current conditions
        """
        try:
            if self.confidence_model is None:
                return 0.5  # Default probability
            
            # Prepare features
            features = self.prepare_features(
                strategy_name, market_conditions, technical_indicators,
                sentiment_data, volume_data, volatility_data
            )
            
            # Scale features
            features_scaled = self.scaler.transform([features])
            
            # Predict probability
            probability = self.confidence_model.predict_proba(features_scaled)[0][1]  # Probability of success
            
            return min(max(probability, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error predicting trade success: {e}")
            return 0.5
    
    def recommend_strategy(self, 
                          market_conditions: Dict,
                          available_strategies: List[str]) -> Tuple[str, float]:
        """
        Recommend the best strategy based on current market conditions
        """
        try:
            if not self.trade_history or len(self.trade_history) < 10:
                return available_strategies[0], 0.5  # Default to first strategy
            
            strategy_scores = {}
            
            for strategy in available_strategies:
                # Get historical performance for this strategy
                strategy_trades = [t for t in self.trade_history if t.strategy_name == strategy]
                
                if not strategy_trades:
                    strategy_scores[strategy] = 0.5
                    continue
                
                # Calculate performance metrics
                win_rate = sum(1 for t in strategy_trades if t.success) / len(strategy_trades)
                avg_pnl = sum(t.pnl_percentage for t in strategy_trades) / len(strategy_trades)
                
                # Weight by recent performance (last 30 days)
                recent_cutoff = datetime.now() - timedelta(days=30)
                recent_trades = [t for t in strategy_trades if t.timestamp > recent_cutoff]
                
                if recent_trades:
                    recent_win_rate = sum(1 for t in recent_trades if t.success) / len(recent_trades)
                    recent_avg_pnl = sum(t.pnl_percentage for t in recent_trades) / len(recent_trades)
                    
                    # Combine historical and recent performance
                    combined_score = (win_rate * 0.3 + recent_win_rate * 0.7) * (1 + avg_pnl * 0.1)
                else:
                    combined_score = win_rate * (1 + avg_pnl * 0.1)
                
                strategy_scores[strategy] = combined_score
            
            # Select best strategy
            best_strategy = max(strategy_scores, key=strategy_scores.get)
            confidence = strategy_scores[best_strategy]
            
            return best_strategy, confidence
            
        except Exception as e:
            logger.error(f"Error recommending strategy: {e}")
            return available_strategies[0], 0.5
    
    def adjust_confidence_score(self, 
                               base_confidence: float,
                               strategy_name: str,
                               market_conditions: Dict) -> float:
        """
        Adjust confidence score based on learned patterns
        """
        try:
            if not self.trade_history:
                return base_confidence
            
            # Get similar historical trades
            similar_trades = self.find_similar_trades(strategy_name, market_conditions)
            
            if not similar_trades:
                return base_confidence
            
            # Calculate historical success rate for similar conditions
            success_rate = sum(1 for t in similar_trades if t.success) / len(similar_trades)
            
            # Adjust confidence based on historical performance
            adjustment_factor = (success_rate - 0.5) * 0.4  # Max adjustment of ±0.2
            adjusted_confidence = base_confidence + adjustment_factor
            
            return min(max(adjusted_confidence, 0.1), 0.95)
            
        except Exception as e:
            logger.error(f"Error adjusting confidence score: {e}")
            return base_confidence
    
    def find_similar_trades(self, strategy_name: str, market_conditions: Dict) -> List[TradeOutcome]:
        """
        Find historically similar trades based on strategy and market conditions
        """
        similar_trades = []
        
        try:
            current_volatility = market_conditions.get('volatility', 0.02)
            current_volume_ratio = market_conditions.get('volume_ratio', 1.0)
            current_sentiment = market_conditions.get('sentiment', 0.0)
            
            for trade in self.trade_history:
                if trade.strategy_name != strategy_name:
                    continue
                
                # Check similarity in market conditions
                trade_volatility = trade.market_conditions.get('volatility', 0.02)
                trade_volume_ratio = trade.market_conditions.get('volume_ratio', 1.0)
                trade_sentiment = trade.market_conditions.get('sentiment', 0.0)
                
                # Calculate similarity score
                volatility_diff = abs(current_volatility - trade_volatility) / max(current_volatility, trade_volatility)
                volume_diff = abs(current_volume_ratio - trade_volume_ratio) / max(current_volume_ratio, trade_volume_ratio)
                sentiment_diff = abs(current_sentiment - trade_sentiment) / 2.0  # Sentiment range is -1 to 1
                
                # Consider trades similar if all differences are within thresholds
                if volatility_diff < 0.5 and volume_diff < 0.5 and sentiment_diff < 0.3:
                    similar_trades.append(trade)
            
        except Exception as e:
            logger.error(f"Error finding similar trades: {e}")
        
        return similar_trades
    
    def prepare_features(self, 
                        strategy_name: str,
                        market_conditions: Dict,
                        technical_indicators: Dict,
                        sentiment_data: Dict,
                        volume_data: Dict,
                        volatility_data: Dict) -> List[float]:
        """
        Prepare feature vector for machine learning models
        """
        features = []
        
        try:
            # Strategy encoding (one-hot)
            strategies = ['momentum', 'mean_reversion', 'breakout', 'scalping']
            for strategy in strategies:
                features.append(1.0 if strategy_name == strategy else 0.0)
            
            # Market conditions
            features.extend([
                market_conditions.get('volatility', 0.02),
                market_conditions.get('volume_ratio', 1.0),
                market_conditions.get('sentiment', 0.0),
                market_conditions.get('trend_strength', 0.0)
            ])
            
            # Technical indicators
            features.extend([
                technical_indicators.get('rsi', 50) / 100.0,  # Normalize to 0-1
                technical_indicators.get('macd', 0.0),
                technical_indicators.get('bollinger_position', 0.5),
                technical_indicators.get('sma_ratio', 1.0),
                technical_indicators.get('ema_ratio', 1.0)
            ])
            
            # Sentiment data
            features.extend([
                sentiment_data.get('overall_sentiment', 0.0),
                sentiment_data.get('confidence', 0.0),
                sentiment_data.get('positive_ratio', 0.0),
                sentiment_data.get('negative_ratio', 0.0)
            ])
            
            # Volume data
            features.extend([
                min(volume_data.get('volume_ratio', 1.0), 10.0) / 10.0,  # Cap and normalize
                1.0 if volume_data.get('volume_spike', False) else 0.0,
                {'increasing': 1.0, 'decreasing': -1.0, 'stable': 0.0}.get(
                    volume_data.get('volume_trend', 'stable'), 0.0)
            ])
            
            # Volatility data
            features.extend([
                min(volatility_data.get('current_volatility', 0.02), 0.2) / 0.2,  # Cap and normalize
                volatility_data.get('volatility_percentile', 50.0) / 100.0,
                {'increasing': 1.0, 'decreasing': -1.0, 'stable': 0.0}.get(
                    volatility_data.get('volatility_trend', 'stable'), 0.0)
            ])
            
        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            features = [0.0] * 20  # Default feature vector
        
        return features
    
    def retrain_models(self):
        """
        Retrain machine learning models with latest data
        """
        try:
            if len(self.trade_history) < self.min_trades_for_learning:
                logger.info(f"Not enough trades for retraining: {len(self.trade_history)}")
                return
            
            logger.info("Starting model retraining...")
            
            # Prepare training data
            X, y = self.prepare_training_data()
            
            if len(X) < 10:
                logger.warning("Insufficient training data")
                return
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train confidence model (binary classification)
            self.confidence_model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            self.confidence_model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = self.confidence_model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            
            logger.info(f"Model performance - Accuracy: {accuracy:.3f}, Precision: {precision:.3f}, Recall: {recall:.3f}")
            
            # Save models
            self.save_models()
            
            # Update learning metrics
            self.learning_metrics.last_updated = datetime.now()
            self.save_learning_metrics()
            
        except Exception as e:
            logger.error(f"Error retraining models: {e}")
    
    def prepare_training_data(self) -> Tuple[List[List[float]], List[int]]:
        """
        Prepare training data from trade history
        """
        X = []
        y = []
        
        try:
            for trade in self.trade_history:
                features = self.prepare_features(
                    trade.strategy_name,
                    trade.market_conditions,
                    trade.technical_indicators,
                    trade.sentiment_data,
                    trade.volume_data,
                    trade.volatility_data
                )
                
                X.append(features)
                y.append(1 if trade.success else 0)
                
        except Exception as e:
            logger.error(f"Error preparing training data: {e}")
        
        return X, y
    
    def should_retrain(self) -> bool:
        """
        Determine if models should be retrained
        """
        try:
            # Check if enough time has passed
            if self.learning_metrics.last_updated:
                time_since_update = datetime.now() - self.learning_metrics.last_updated
                if time_since_update.total_seconds() < self.retrain_frequency_hours * 3600:
                    return False
            
            # Check if enough new trades
            return len(self.trade_history) >= self.min_trades_for_learning
            
        except Exception as e:
            logger.error(f"Error checking retrain condition: {e}")
            return False
    
    def update_learning_metrics(self):
        """
        Update learning metrics based on current trade history
        """
        try:
            if not self.trade_history:
                return
            
            total_trades = len(self.trade_history)
            successful_trades = sum(1 for t in self.trade_history if t.success)
            win_rate = successful_trades / total_trades
            avg_pnl = sum(t.pnl_percentage for t in self.trade_history) / total_trades
            avg_confidence = sum(t.confidence_score for t in self.trade_history) / total_trades
            
            # Strategy performance
            strategy_performance = {}
            for strategy in set(t.strategy_name for t in self.trade_history):
                strategy_trades = [t for t in self.trade_history if t.strategy_name == strategy]
                strategy_wins = sum(1 for t in strategy_trades if t.success)
                strategy_performance[strategy] = {
                    'total_trades': len(strategy_trades),
                    'win_rate': strategy_wins / len(strategy_trades),
                    'avg_pnl': sum(t.pnl_percentage for t in strategy_trades) / len(strategy_trades)
                }
            
            # Confidence accuracy (how well confidence predicts success)
            confidence_accuracy = self.calculate_confidence_accuracy()
            
            self.learning_metrics = LearningMetrics(
                total_trades=total_trades,
                successful_trades=successful_trades,
                win_rate=win_rate,
                avg_pnl=avg_pnl,
                avg_confidence=avg_confidence,
                strategy_performance=strategy_performance,
                market_condition_performance={},  # TODO: Implement
                confidence_accuracy=confidence_accuracy,
                last_updated=datetime.now()
            )
            
            self.save_learning_metrics()
            
        except Exception as e:
            logger.error(f"Error updating learning metrics: {e}")
    
    def calculate_confidence_accuracy(self) -> Dict:
        """
        Calculate how accurately confidence scores predict trade success
        """
        accuracy_by_range = {}
        
        try:
            confidence_ranges = [
                (0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)
            ]
            
            for min_conf, max_conf in confidence_ranges:
                range_trades = [
                    t for t in self.trade_history 
                    if min_conf <= t.confidence_score < max_conf
                ]
                
                if range_trades:
                    success_rate = sum(1 for t in range_trades if t.success) / len(range_trades)
                    accuracy_by_range[f"{min_conf}-{max_conf}"] = {
                        'trades': len(range_trades),
                        'success_rate': success_rate,
                        'expected_range': (min_conf + max_conf) / 2
                    }
                    
        except Exception as e:
            logger.error(f"Error calculating confidence accuracy: {e}")
        
        return accuracy_by_range
    
    def save_trade_history(self):
        """Save trade history to persistent storage"""
        try:
            file_path = os.path.join(self.data_path, 'trade_history.json')
            with open(file_path, 'w') as f:
                json.dump([asdict(trade) for trade in self.trade_history], f, default=str)
        except Exception as e:
            logger.error(f"Error saving trade history: {e}")
    
    def load_trade_history(self) -> List[TradeOutcome]:
        """Load trade history from persistent storage"""
        try:
            file_path = os.path.join(self.data_path, 'trade_history.json')
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    return [TradeOutcome(**trade) for trade in data]
        except Exception as e:
            logger.error(f"Error loading trade history: {e}")
        return []
    
    def save_learning_metrics(self):
        """Save learning metrics to persistent storage"""
        try:
            file_path = os.path.join(self.data_path, 'learning_metrics.json')
            with open(file_path, 'w') as f:
                json.dump(asdict(self.learning_metrics), f, default=str)
        except Exception as e:
            logger.error(f"Error saving learning metrics: {e}")
    
    def load_learning_metrics(self) -> LearningMetrics:
        """Load learning metrics from persistent storage"""
        try:
            file_path = os.path.join(self.data_path, 'learning_metrics.json')
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    return LearningMetrics(**data)
        except Exception as e:
            logger.error(f"Error loading learning metrics: {e}")
        
        return LearningMetrics(
            total_trades=0,
            successful_trades=0,
            win_rate=0.0,
            avg_pnl=0.0,
            avg_confidence=0.0,
            strategy_performance={},
            market_condition_performance={},
            confidence_accuracy={},
            last_updated=datetime.now()
        )
    
    def save_models(self):
        """Save trained models to persistent storage"""
        try:
            if self.confidence_model:
                joblib.dump(self.confidence_model, os.path.join(self.model_path, 'confidence_model.pkl'))
            joblib.dump(self.scaler, os.path.join(self.model_path, 'scaler.pkl'))
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def load_models(self):
        """Load trained models from persistent storage"""
        try:
            confidence_model_path = os.path.join(self.model_path, 'confidence_model.pkl')
            scaler_path = os.path.join(self.model_path, 'scaler.pkl')
            
            if os.path.exists(confidence_model_path):
                self.confidence_model = joblib.load(confidence_model_path)
            
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def get_learning_insights(self) -> Dict:
        """
        Get insights from the learning process
        """
        insights = {
            'total_trades': self.learning_metrics.total_trades,
            'win_rate': self.learning_metrics.win_rate,
            'avg_pnl': self.learning_metrics.avg_pnl,
            'best_strategy': None,
            'worst_strategy': None,
            'confidence_calibration': 'good',
            'recommendations': []
        }
        
        try:
            # Find best and worst performing strategies
            if self.learning_metrics.strategy_performance:
                best_strategy = max(
                    self.learning_metrics.strategy_performance.items(),
                    key=lambda x: x[1]['win_rate']
                )
                worst_strategy = min(
                    self.learning_metrics.strategy_performance.items(),
                    key=lambda x: x[1]['win_rate']
                )
                
                insights['best_strategy'] = {
                    'name': best_strategy[0],
                    'win_rate': best_strategy[1]['win_rate'],
                    'avg_pnl': best_strategy[1]['avg_pnl']
                }
                
                insights['worst_strategy'] = {
                    'name': worst_strategy[0],
                    'win_rate': worst_strategy[1]['win_rate'],
                    'avg_pnl': worst_strategy[1]['avg_pnl']
                }
            
            # Generate recommendations
            if self.learning_metrics.win_rate < 0.4:
                insights['recommendations'].append("Consider adjusting risk management parameters")
            
            if self.learning_metrics.avg_confidence > 0.8 and self.learning_metrics.win_rate < 0.6:
                insights['recommendations'].append("Confidence scores may be overestimated")
                insights['confidence_calibration'] = 'overconfident'
            
            if self.learning_metrics.avg_confidence < 0.4 and self.learning_metrics.win_rate > 0.6:
                insights['recommendations'].append("Confidence scores may be underestimated")
                insights['confidence_calibration'] = 'underconfident'
                
        except Exception as e:
            logger.error(f"Error generating learning insights: {e}")
        
        return insights


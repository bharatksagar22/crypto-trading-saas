"""
Confidence Calculator Module
Calculates confidence scores for trading strategies (0-100%)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import logging

class ConfidenceCalculator:
    """
    Advanced Confidence Calculator for Trading Strategies
    Uses machine learning to predict strategy success probability
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.model = None
        self.scaler = StandardScaler()
        self.feature_importance = {}
        self.confidence_history = []
        
        # Initialize or load pre-trained model
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the confidence prediction model"""
        
        try:
            # Try to load existing model
            self.model = joblib.load('confidence_model.pkl')
            self.scaler = joblib.load('confidence_scaler.pkl')
            self.logger.info("Loaded existing confidence model")
        except:
            # Create new model
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.logger.info("Created new confidence model")
    
    async def calculate(self, strategy: Dict, market_data: Dict, 
                       strategy_performance: Dict) -> float:
        """
        Calculate confidence score for a trading strategy
        
        Args:
            strategy: Strategy details
            market_data: Current market conditions
            strategy_performance: Historical performance data
            
        Returns:
            Confidence score (0-100)
        """
        
        # Extract features for confidence calculation
        features = self._extract_features(strategy, market_data, strategy_performance)
        
        # Calculate base confidence using multiple factors
        base_confidence = self._calculate_base_confidence(features)
        
        # Apply machine learning prediction if model is trained
        ml_confidence = self._predict_ml_confidence(features)
        
        # Combine base and ML confidence
        if ml_confidence is not None:
            final_confidence = (base_confidence * 0.6) + (ml_confidence * 0.4)
        else:
            final_confidence = base_confidence
        
        # Apply confidence modifiers
        final_confidence = self._apply_confidence_modifiers(
            final_confidence, strategy, market_data
        )
        
        # Store for learning
        self.confidence_history.append({
            'timestamp': datetime.now(),
            'strategy': strategy['name'],
            'confidence': final_confidence,
            'features': features
        })
        
        return np.clip(final_confidence, 0, 100)
    
    def _extract_features(self, strategy: Dict, market_data: Dict, 
                         strategy_performance: Dict) -> Dict:
        """Extract features for confidence calculation"""
        
        features = {}
        
        # Strategy-specific features
        features['strategy_type'] = self._encode_strategy_type(strategy['name'])
        features['risk_reward_ratio'] = strategy.get('risk_reward_ratio', 1.0)
        features['expected_duration'] = strategy.get('expected_duration', 60)  # minutes
        
        # Market condition features
        price_data = market_data.get('price', {})
        features['price_trend'] = self._calculate_price_trend(price_data)
        features['volatility'] = market_data.get('volume', {}).get('volatility', 0.5)
        features['volume_ratio'] = market_data.get('volume', {}).get('volume_ratio', 1.0)
        
        # Sentiment features
        sentiment_data = market_data.get('sentiment', {})
        features['sentiment_score'] = sentiment_data.get('overall_score', 0.5)
        features['sentiment_strength'] = sentiment_data.get('strength', 0.5)
        
        # Option chain features (Greeks)
        options_data = market_data.get('options', {})
        features['delta'] = options_data.get('delta', 0.5)
        features['gamma'] = options_data.get('gamma', 0.1)
        features['theta'] = options_data.get('theta', -0.1)
        features['implied_volatility'] = options_data.get('iv', 0.3)
        
        # Historical performance features
        strategy_name = strategy['name']
        if strategy_name in strategy_performance:
            perf = strategy_performance[strategy_name]
            features['historical_win_rate'] = perf.get('win_rate', 0.5)
            features['avg_profit'] = perf.get('avg_profit', 0.0)
            features['sharpe_ratio'] = perf.get('sharpe_ratio', 0.0)
            features['total_trades'] = min(perf.get('total_trades', 0), 100)  # Cap for normalization
        else:
            # Default values for new strategies
            features['historical_win_rate'] = 0.5
            features['avg_profit'] = 0.0
            features['sharpe_ratio'] = 0.0
            features['total_trades'] = 0
        
        # Time-based features
        now = datetime.now()
        features['hour_of_day'] = now.hour / 24.0
        features['day_of_week'] = now.weekday() / 6.0
        
        # Market regime features
        features['market_regime_bull'] = 1.0 if market_data.get('regime') == 'bull' else 0.0
        features['market_regime_bear'] = 1.0 if market_data.get('regime') == 'bear' else 0.0
        features['market_regime_volatile'] = 1.0 if market_data.get('regime') == 'volatile' else 0.0
        
        return features
    
    def _encode_strategy_type(self, strategy_name: str) -> float:
        """Encode strategy type as numerical value"""
        
        strategy_encoding = {
            'momentum': 0.1,
            'mean_reversion': 0.2,
            'breakout': 0.3,
            'scalping': 0.4,
            'swing': 0.5,
            'arbitrage': 0.6,
            'grid': 0.7,
            'dca': 0.8,
            'webhook_signal': 0.9
        }
        
        for key, value in strategy_encoding.items():
            if key in strategy_name.lower():
                return value
        
        return 0.5  # Default
    
    def _calculate_price_trend(self, price_data: Dict) -> float:
        """Calculate price trend strength"""
        
        history = price_data.get('history', [])
        if len(history) < 10:
            return 0.0
        
        # Calculate trend using linear regression
        x = np.arange(len(history))
        slope, _ = np.polyfit(x, history, 1)
        
        # Normalize slope
        price_range = max(history) - min(history)
        if price_range > 0:
            normalized_slope = slope / (price_range / len(history))
        else:
            normalized_slope = 0.0
        
        return np.clip(normalized_slope, -1, 1)
    
    def _calculate_base_confidence(self, features: Dict) -> float:
        """Calculate base confidence using rule-based approach"""
        
        confidence = 50.0  # Start with neutral confidence
        
        # Historical performance weight (40%)
        historical_weight = 0.4
        win_rate = features.get('historical_win_rate', 0.5)
        total_trades = features.get('total_trades', 0)
        
        # Adjust for sample size
        sample_confidence = min(total_trades / 20.0, 1.0)  # Full confidence after 20 trades
        historical_score = (win_rate * 100) * sample_confidence
        confidence += (historical_score - 50) * historical_weight
        
        # Risk-reward ratio weight (20%)
        rr_ratio = features.get('risk_reward_ratio', 1.0)
        if rr_ratio >= 2.0:
            confidence += 15
        elif rr_ratio >= 1.5:
            confidence += 10
        elif rr_ratio >= 1.0:
            confidence += 5
        else:
            confidence -= 10
        
        # Market conditions weight (20%)
        volatility = features.get('volatility', 0.5)
        volume_ratio = features.get('volume_ratio', 1.0)
        
        # Moderate volatility is good
        if 0.3 <= volatility <= 0.7:
            confidence += 10
        elif volatility > 0.8:
            confidence -= 5
        
        # High volume is good
        if volume_ratio > 1.5:
            confidence += 10
        elif volume_ratio < 0.8:
            confidence -= 5
        
        # Sentiment weight (10%)
        sentiment_score = features.get('sentiment_score', 0.5)
        sentiment_strength = features.get('sentiment_strength', 0.5)
        
        sentiment_impact = (sentiment_score - 0.5) * sentiment_strength * 20
        confidence += sentiment_impact
        
        # Greeks weight (10%)
        delta = abs(features.get('delta', 0.5))
        if delta > 0.7:  # Strong directional exposure
            confidence += 5
        
        return np.clip(confidence, 0, 100)
    
    def _predict_ml_confidence(self, features: Dict) -> Optional[float]:
        """Predict confidence using machine learning model"""
        
        if self.model is None or len(self.confidence_history) < 50:
            return None
        
        try:
            # Convert features to array
            feature_array = np.array(list(features.values())).reshape(1, -1)
            
            # Scale features
            feature_array_scaled = self.scaler.transform(feature_array)
            
            # Predict confidence
            predicted_confidence = self.model.predict(feature_array_scaled)[0]
            
            return np.clip(predicted_confidence, 0, 100)
            
        except Exception as e:
            self.logger.error(f"Error in ML confidence prediction: {e}")
            return None
    
    def _apply_confidence_modifiers(self, base_confidence: float, 
                                  strategy: Dict, market_data: Dict) -> float:
        """Apply additional confidence modifiers"""
        
        confidence = base_confidence
        
        # Time-based modifiers
        hour = datetime.now().hour
        
        # Reduce confidence during low-activity hours
        if 2 <= hour <= 6:  # Late night/early morning
            confidence *= 0.9
        elif 9 <= hour <= 16:  # Active trading hours
            confidence *= 1.05
        
        # Market regime modifiers
        regime = market_data.get('regime')
        strategy_type = strategy.get('name', '').lower()
        
        # Strategy-regime compatibility
        if regime == 'bull' and 'momentum' in strategy_type:
            confidence *= 1.1
        elif regime == 'bear' and 'short' in strategy_type:
            confidence *= 1.1
        elif regime == 'sideways' and 'mean_reversion' in strategy_type:
            confidence *= 1.1
        elif regime == 'volatile' and 'scalping' in strategy_type:
            confidence *= 0.9  # Reduce scalping in high volatility
        
        # Risk management modifiers
        if strategy.get('stop_loss_pct', 0) > 0.05:  # Stop loss > 5%
            confidence *= 0.95
        
        return np.clip(confidence, 0, 100)
    
    async def retrain(self, trade_history: List[Dict]):
        """Retrain the confidence model with new trade data"""
        
        if len(trade_history) < 20:
            return
        
        try:
            # Prepare training data
            X, y = self._prepare_training_data(trade_history)
            
            if len(X) < 10:
                return
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model.fit(X_scaled, y)
            
            # Calculate feature importance
            feature_names = list(self.confidence_history[0]['features'].keys())
            self.feature_importance = dict(zip(
                feature_names, 
                self.model.feature_importances_
            ))
            
            # Save model
            joblib.dump(self.model, 'confidence_model.pkl')
            joblib.dump(self.scaler, 'confidence_scaler.pkl')
            
            self.logger.info(f"Retrained confidence model with {len(X)} samples")
            
        except Exception as e:
            self.logger.error(f"Error retraining confidence model: {e}")
    
    def _prepare_training_data(self, trade_history: List[Dict]) -> tuple:
        """Prepare training data from trade history"""
        
        X = []
        y = []
        
        for trade in trade_history:
            if 'outcome' in trade:  # Only use completed trades
                # Features
                features = trade.get('features', {})
                if features:
                    X.append(list(features.values()))
                    
                    # Target (actual success rate)
                    outcome = trade['outcome']
                    success_score = 100 if outcome['profit'] > 0 else 0
                    y.append(success_score)
        
        return np.array(X), np.array(y)
    
    async def validate_external_signal(self, decision: Any, market_data: Dict) -> float:
        """Validate external webhook signal with AI confidence"""
        
        # Create pseudo-strategy for external signal
        pseudo_strategy = {
            'name': 'external_signal',
            'risk_reward_ratio': decision.risk_reward_ratio,
            'expected_duration': 30
        }
        
        # Calculate confidence for external signal
        confidence = await self.calculate(
            pseudo_strategy, 
            market_data, 
            {}  # No historical performance for external signals
        )
        
        # Apply external signal penalty (be more conservative)
        confidence *= 0.8
        
        return confidence
    
    def get_confidence_distribution(self) -> Dict:
        """Get distribution of confidence scores"""
        
        if not self.confidence_history:
            return {}
        
        confidences = [entry['confidence'] for entry in self.confidence_history[-100:]]
        
        return {
            'mean': np.mean(confidences),
            'std': np.std(confidences),
            'min': np.min(confidences),
            'max': np.max(confidences),
            'median': np.median(confidences)
        }
    
    def get_feature_importance(self) -> Dict:
        """Get feature importance from the model"""
        
        return self.feature_importance


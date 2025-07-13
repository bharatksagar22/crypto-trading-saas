"""
User Configuration Models
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class RiskSettings(BaseModel):
    daily_loss_cap: float = 1000.0
    max_trade_count_per_day: int = 10
    max_trade_size_percent: float = 5.0
    max_leverage_cap: float = 10.0
    trade_sl: float = 250.0
    profit_target_per_trade: float = 400.0
    trailing_stop_loss_enabled: bool = True
    stop_loss_percentage: float = 0.02
    take_profit_percentage: float = 0.04
    max_concurrent_trades: int = 5

class AIStrategies(BaseModel):
    volatility_scanner: bool = True
    news_sentiment_trigger: bool = True
    trailing_stop_loss: bool = True
    profit_optimizer: bool = True
    smart_entry_timing: bool = True
    multi_timeframe_analysis: bool = True
    ai_learning_feedback: bool = True
    weekend_low_volume_mode: bool = True
    auto_rebalancer: bool = True
    auto_leverage_optimizer: bool = True
    option_chain_analysis: bool = False
    greeks_analysis: bool = False
    volume_spike_entry: bool = True
    high_rr_trade_filter: bool = True
    pre_trade_risk_analyzer: bool = True
    confidence_based_positioning: bool = True
    capital_conservation_mode: bool = True
    auto_capital_increase: bool = True

class UserConfig(BaseModel):
    user_id: str
    trading_active: bool = False
    paper_trading_mode: bool = True
    enabled_coins: List[str] = Field(default_factory=lambda: ["BTC", "ETH"])
    
    # AI Strategy Configuration
    ai_strategies: AIStrategies = Field(default_factory=AIStrategies)
    
    # Risk Management
    risk_settings: RiskSettings = Field(default_factory=RiskSettings)
    
    # Trading Preferences
    preferred_timeframes: List[str] = Field(default_factory=lambda: ["1h", "4h", "1d"])
    max_open_positions: int = 5
    position_sizing_method: str = "fixed_percentage"  # fixed_percentage, kelly_criterion, volatility_based
    
    # AI Learning Settings
    learning_enabled: bool = True
    confidence_threshold: float = 0.6
    min_confidence_for_execution: float = 0.7
    
    # Notification Settings
    telegram_notifications: bool = False
    email_notifications: bool = True
    webhook_notifications: bool = False
    
    # Performance Tracking
    track_performance: bool = True
    performance_benchmark: str = "BTC"  # Benchmark for performance comparison
    
    # Advanced Settings
    use_machine_learning: bool = True
    sentiment_analysis_enabled: bool = True
    technical_analysis_weight: float = 0.7
    fundamental_analysis_weight: float = 0.3
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = None

class StrategyConfig(BaseModel):
    strategy_name: str
    enabled: bool = True
    confidence_threshold: float = 0.6
    max_position_size: float = 0.05  # 5% of portfolio
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
    # Performance Tracking
    total_signals: int = 0
    successful_signals: int = 0
    total_pnl: float = 0.0
    confidence_score: float = 50.0
    
    # Learning Parameters
    learning_rate: float = 0.1
    adaptation_enabled: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TradingSession(BaseModel):
    user_id: str
    session_id: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    
    # Session Stats
    total_trades: int = 0
    winning_trades: int = 0
    total_pnl: float = 0.0
    max_drawdown: float = 0.0
    
    # Configuration Snapshot
    enabled_strategies: List[str] = Field(default_factory=list)
    enabled_coins: List[str] = Field(default_factory=list)
    risk_settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Status
    active: bool = True
    stopped_reason: Optional[str] = None

class UserPerformance(BaseModel):
    user_id: str
    period_start: datetime
    period_end: datetime
    
    # Trading Metrics
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    
    # Financial Metrics
    total_pnl: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    
    # Strategy Performance
    strategy_performance: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    
    # Risk Metrics
    var_95: float = 0.0  # Value at Risk 95%
    max_consecutive_losses: int = 0
    avg_trade_duration: float = 0.0  # in hours
    
    # Benchmark Comparison
    benchmark_return: float = 0.0
    alpha: float = 0.0
    beta: float = 0.0
    
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


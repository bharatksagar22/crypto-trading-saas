"""
Trading Signal Models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import uuid

class SignalAction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class SignalType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    TAKE_PROFIT = "TAKE_PROFIT"

class SignalPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class TradingSignal(BaseModel):
    signal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    action: SignalAction
    signal_type: SignalType = SignalType.MARKET
    price: Optional[float] = None
    quantity: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    
    # AI Analysis
    confidence_score: float = Field(ge=0.0, le=1.0)
    strategy_name: str
    reasoning: str
    priority: SignalPriority = SignalPriority.MEDIUM
    
    # Market Context
    current_price: float
    market_trend: str
    volatility: float
    volume_ratio: float
    
    # Risk Metrics
    risk_reward_ratio: Optional[float] = None
    max_loss: Optional[float] = None
    expected_profit: Optional[float] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    executed: bool = False
    executed_at: Optional[datetime] = None
    
    # Additional Data
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SignalResponse(BaseModel):
    signal: TradingSignal
    execution_status: str
    execution_price: Optional[float] = None
    execution_time: Optional[datetime] = None
    error_message: Optional[str] = None

class StrategySignal(BaseModel):
    strategy_name: str
    symbol: str
    action: SignalAction
    confidence: float
    reasoning: str
    indicators: Dict[str, float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MarketSignal(BaseModel):
    symbol: str
    signal_type: str
    strength: float
    direction: str
    indicators: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RiskSignal(BaseModel):
    user_id: str
    signal_type: str  # 'stop_trading', 'reduce_position', 'warning'
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    recommended_action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SignalHistory(BaseModel):
    signal_id: str
    user_id: str
    symbol: str
    action: SignalAction
    confidence_score: float
    strategy_name: str
    
    # Execution Details
    executed: bool
    execution_price: Optional[float] = None
    execution_time: Optional[datetime] = None
    
    # Performance
    pnl: Optional[float] = None
    success: Optional[bool] = None
    
    # Timestamps
    created_at: datetime
    closed_at: Optional[datetime] = None

class SignalPerformance(BaseModel):
    strategy_name: str
    total_signals: int
    executed_signals: int
    successful_signals: int
    success_rate: float
    avg_confidence: float
    avg_pnl: float
    total_pnl: float
    best_signal_pnl: float
    worst_signal_pnl: float
    avg_execution_time: float  # in seconds


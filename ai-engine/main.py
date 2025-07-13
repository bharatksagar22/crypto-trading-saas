"""
AI Trading Engine - Main Application
Handles AI-powered trading decisions and strategy execution
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from dotenv import load_dotenv

from config.database import init_db, close_db
from models.trading_signal import TradingSignal, SignalResponse
from models.user_config import UserConfig
from strategies.strategy_manager import StrategyManager
from utils.market_data import MarketDataProvider
from utils.ai_engine import AITradingEngine
from utils.risk_manager import RiskManager
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logger(__name__)

# Global instances
strategy_manager = None
market_data_provider = None
ai_engine = None
risk_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global strategy_manager, market_data_provider, ai_engine, risk_manager
    
    # Startup
    logger.info("Starting AI Trading Engine...")
    
    # Initialize database
    await init_db()
    
    # Initialize components
    strategy_manager = StrategyManager()
    market_data_provider = MarketDataProvider()
    ai_engine = AITradingEngine()
    risk_manager = RiskManager()
    
    # Start background tasks
    asyncio.create_task(market_data_provider.start_data_feed())
    asyncio.create_task(ai_engine.start_analysis_loop())
    
    logger.info("AI Trading Engine started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Trading Engine...")
    
    # Stop background tasks
    await market_data_provider.stop_data_feed()
    await ai_engine.stop_analysis_loop()
    
    # Close database
    await close_db()
    
    logger.info("AI Trading Engine stopped")

# Create FastAPI app
app = FastAPI(
    title="AI Trading Engine",
    description="AI-powered cryptocurrency trading engine",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class AnalysisRequest(BaseModel):
    user_id: str
    symbols: List[str]
    strategies: Dict[str, bool]
    risk_settings: Dict[str, Any]

class AnalysisResponse(BaseModel):
    user_id: str
    signals: List[TradingSignal]
    market_analysis: Dict[str, Any]
    risk_assessment: Dict[str, Any]

class StrategyToggleRequest(BaseModel):
    user_id: str
    strategy_name: str
    enabled: bool

class UserStatusRequest(BaseModel):
    user_id: str
    trading_active: bool
    enabled_coins: List[str]
    ai_strategies: Dict[str, bool]
    risk_settings: Dict[str, Any]

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "AI Trading Engine",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "strategy_manager": strategy_manager is not None,
            "market_data": market_data_provider is not None,
            "ai_engine": ai_engine is not None,
            "risk_manager": risk_manager is not None
        }
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_market(request: AnalysisRequest):
    """Analyze market and generate trading signals"""
    try:
        logger.info(f"Analyzing market for user {request.user_id}")
        
        # Get market data
        market_data = await market_data_provider.get_market_data(request.symbols)
        
        # Generate AI analysis
        analysis = await ai_engine.analyze_market(
            market_data, 
            request.strategies,
            request.risk_settings
        )
        
        # Generate trading signals
        signals = await strategy_manager.generate_signals(
            request.user_id,
            market_data,
            request.strategies,
            analysis
        )
        
        # Risk assessment
        risk_assessment = await risk_manager.assess_risk(
            request.user_id,
            signals,
            request.risk_settings
        )
        
        return AnalysisResponse(
            user_id=request.user_id,
            signals=signals,
            market_analysis=analysis,
            risk_assessment=risk_assessment
        )
        
    except Exception as e:
        logger.error(f"Analysis error for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-signal")
async def execute_trading_signal(signal: TradingSignal, background_tasks: BackgroundTasks):
    """Execute a trading signal"""
    try:
        logger.info(f"Executing signal for user {signal.user_id}: {signal.symbol} {signal.action}")
        
        # Add to background task queue
        background_tasks.add_task(
            ai_engine.execute_signal,
            signal
        )
        
        return {"status": "queued", "signal_id": signal.signal_id}
        
    except Exception as e:
        logger.error(f"Signal execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-user-status")
async def update_user_status(request: UserStatusRequest):
    """Update user trading status and configuration"""
    try:
        logger.info(f"Updating status for user {request.user_id}")
        
        # Update user configuration
        await ai_engine.update_user_config(
            request.user_id,
            {
                "trading_active": request.trading_active,
                "enabled_coins": request.enabled_coins,
                "ai_strategies": request.ai_strategies,
                "risk_settings": request.risk_settings
            }
        )
        
        return {"status": "updated", "user_id": request.user_id}
        
    except Exception as e:
        logger.error(f"User status update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/toggle-strategy")
async def toggle_strategy(request: StrategyToggleRequest):
    """Toggle a specific strategy for a user"""
    try:
        logger.info(f"Toggling strategy {request.strategy_name} for user {request.user_id}: {request.enabled}")
        
        await strategy_manager.toggle_strategy(
            request.user_id,
            request.strategy_name,
            request.enabled
        )
        
        return {
            "status": "updated",
            "user_id": request.user_id,
            "strategy": request.strategy_name,
            "enabled": request.enabled
        }
        
    except Exception as e:
        logger.error(f"Strategy toggle error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/{user_id}/signals")
async def get_user_signals(user_id: str, limit: int = 10):
    """Get recent signals for a user"""
    try:
        signals = await ai_engine.get_user_signals(user_id, limit)
        return {"user_id": user_id, "signals": signals}
        
    except Exception as e:
        logger.error(f"Get user signals error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/{user_id}/performance")
async def get_user_performance(user_id: str, days: int = 30):
    """Get user trading performance"""
    try:
        performance = await ai_engine.get_user_performance(user_id, days)
        return {"user_id": user_id, "performance": performance}
        
    except Exception as e:
        logger.error(f"Get user performance error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market-data/{symbol}")
async def get_market_data(symbol: str):
    """Get current market data for a symbol"""
    try:
        data = await market_data_provider.get_symbol_data(symbol)
        return {"symbol": symbol, "data": data}
        
    except Exception as e:
        logger.error(f"Get market data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/emergency-stop")
async def emergency_stop():
    """Emergency stop all trading activities"""
    try:
        logger.warning("Emergency stop activated")
        
        await ai_engine.emergency_stop()
        
        return {"status": "stopped", "message": "All trading activities stopped"}
        
    except Exception as e:
        logger.error(f"Emergency stop error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/strategies")
async def get_available_strategies():
    """Get list of available trading strategies"""
    try:
        strategies = await strategy_manager.get_available_strategies()
        return {"strategies": strategies}
        
    except Exception as e:
        logger.error(f"Get strategies error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_engine_stats():
    """Get AI engine statistics"""
    try:
        stats = await ai_engine.get_engine_stats()
        return {"stats": stats}
        
    except Exception as e:
        logger.error(f"Get stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the application
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )


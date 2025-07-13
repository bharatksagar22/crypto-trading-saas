"""
Comprehensive Test Suite for Enhanced AI Agent
Tests all core functionalities and validates performance
"""

import asyncio
import unittest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add the ai-engine directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.autonomous_agent import AutonomousAIAgent, TradeDecision, AgentState, TradingMode
from core.market_regime_detector import MarketRegimeDetector, MarketRegime
from core.confidence_calculator import ConfidenceCalculator
from core.learning_engine import LearningEngine, TradeOutcome

class TestAIAgent(unittest.TestCase):
    """Test suite for AI Agent core functionality"""
    
    def setUp(self):
        """Set up test environment"""
        
        self.test_config = {
            'delta_api': {
                'api_key': 'test_key',
                'api_secret': 'test_secret',
                'testnet': True
            },
            'risk_management': {
                'max_daily_loss': 1000,
                'daily_target': 2000,
                'max_position_size': 0.1,
                'max_simultaneous_trades': 3
            },
            'min_confidence_threshold': 70,
            'scan_interval': 30,
            'enabled_coins': ['BTCUSDT', 'ETHUSDT'],
            'brokerage_rate': 0.0005,
            'fixed_charges': 0
        }
        
        # Mock external dependencies
        self.mock_delta_client = Mock()
        self.mock_market_data = {
            'BTCUSDT': {
                'price': {
                    'current': 45000,
                    'history': [44000, 44500, 45000]
                },
                'volume': {
                    'current': 1000000,
                    'volatility': 0.3,
                    'volume_ratio': 1.2
                },
                'sentiment': {
                    'overall_score': 0.7,
                    'strength': 0.8
                },
                'options': {
                    'delta': 0.6,
                    'gamma': 0.1,
                    'theta': -0.05,
                    'iv': 0.25
                }
            },
            'regime': MarketRegime.BULL
        }
    
    async def test_agent_initialization(self):
        """Test AI Agent initialization"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            self.assertIsNotNone(agent)
            self.assertEqual(agent.state.trading_mode, TradingMode.ACTIVE)
            self.assertEqual(len(agent.enabled_coins), 2)
            self.assertIn('BTCUSDT', agent.enabled_coins)
    
    async def test_market_analysis(self):
        """Test market condition analysis"""
        
        with patch('core.autonomous_agent.DeltaAPIClient') as mock_client:
            agent = AutonomousAIAgent(self.test_config)
            
            # Mock API responses
            agent.delta_client.get_price_data = AsyncMock(return_value=self.mock_market_data['BTCUSDT']['price'])
            agent.option_chain_analyzer.analyze = AsyncMock(return_value=self.mock_market_data['BTCUSDT']['options'])
            agent.volume_scanner.scan = AsyncMock(return_value=self.mock_market_data['BTCUSDT']['volume'])
            agent.sentiment_analyzer.analyze = AsyncMock(return_value=self.mock_market_data['BTCUSDT']['sentiment'])
            agent.market_regime_detector.detect = AsyncMock(return_value=MarketRegime.BULL)
            
            market_data = await agent._analyze_market_conditions()
            
            self.assertIn('BTCUSDT', market_data)
            self.assertEqual(market_data['regime'], MarketRegime.BULL)
            self.assertEqual(market_data['BTCUSDT']['price']['current'], 45000)
    
    async def test_confidence_calculation(self):
        """Test confidence calculation"""
        
        confidence_calc = ConfidenceCalculator()
        
        test_strategy = {
            'name': 'momentum_strategy',
            'risk_reward_ratio': 2.0,
            'expected_duration': 60
        }
        
        confidence = await confidence_calc.calculate(
            test_strategy,
            self.mock_market_data['BTCUSDT'],
            {}
        )
        
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 100)
        self.assertIsInstance(confidence, float)
    
    async def test_trade_decision_generation(self):
        """Test trading decision generation"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            # Mock strategy engine
            agent.strategy_engine.generate_strategies = AsyncMock(return_value=[
                {
                    'name': 'test_strategy',
                    'action': 'BUY',
                    'stop_loss': 44000,
                    'take_profit': 46000,
                    'risk_level': 'medium',
                    'reasoning': 'Test strategy',
                    'risk_reward_ratio': 2.0
                }
            ])
            
            # Mock confidence calculator
            agent.confidence_calculator.calculate = AsyncMock(return_value=75.0)
            
            # Mock position sizer
            agent.position_sizer.calculate = AsyncMock(return_value=0.1)
            
            # Mock risk manager
            agent.risk_manager.validate_trade = Mock(return_value=True)
            
            decisions = await agent._generate_trading_decisions(self.mock_market_data)
            
            self.assertGreater(len(decisions), 0)
            self.assertIsInstance(decisions[0], TradeDecision)
            self.assertEqual(decisions[0].action, 'BUY')
            self.assertEqual(decisions[0].confidence, 75.0)
    
    async def test_risk_management(self):
        """Test risk management functionality"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            # Test daily loss limit
            agent.state.daily_pnl = -1000
            should_continue = agent._should_continue_trading()
            self.assertFalse(should_continue)
            self.assertEqual(agent.state.trading_mode, TradingMode.STOPPED)
            
            # Reset and test consecutive losses
            agent.state.daily_pnl = 0
            agent.state.trading_mode = TradingMode.ACTIVE
            agent.state.consecutive_losses = 3
            should_continue = agent._should_continue_trading()
            self.assertTrue(should_continue)  # Should continue but in conservative mode
            self.assertEqual(agent.state.trading_mode, TradingMode.CONSERVATIVE)
    
    async def test_learning_engine(self):
        """Test learning engine functionality"""
        
        learning_engine = LearningEngine()
        
        # Create test trade outcome
        trade_outcome = TradeOutcome(
            trade_id='test_001',
            strategy='momentum',
            symbol='BTCUSDT',
            entry_time=datetime.now() - timedelta(hours=1),
            exit_time=datetime.now(),
            entry_price=45000,
            exit_price=46000,
            quantity=0.1,
            profit_loss=100,
            confidence=75.0,
            market_conditions={'regime': 'bull', 'volatility': 0.3},
            success=True
        )
        
        await learning_engine.record_trade_outcome(trade_outcome)
        
        # Check if strategy metrics were updated
        self.assertIn('momentum', learning_engine.strategy_metrics)
        metrics = learning_engine.strategy_metrics['momentum']
        self.assertEqual(metrics['total_trades'], 1)
        self.assertEqual(metrics['profitable_trades'], 1)
        self.assertEqual(metrics['win_rate'], 1.0)
    
    async def test_market_regime_detection(self):
        """Test market regime detection"""
        
        detector = MarketRegimeDetector()
        
        # Test with mock market data
        regime = await detector.detect(self.mock_market_data)
        
        self.assertIsInstance(regime, MarketRegime)
        self.assertIn(regime, [MarketRegime.BULL, MarketRegime.BEAR, 
                              MarketRegime.SIDEWAYS, MarketRegime.VOLATILE])
    
    async def test_webhook_signal_processing(self):
        """Test webhook signal processing"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            # Mock market analysis
            agent._analyze_market_conditions = AsyncMock(return_value=self.mock_market_data)
            
            # Mock confidence validation
            agent.confidence_calculator.validate_external_signal = AsyncMock(return_value=80.0)
            
            # Mock trade execution
            agent._execute_trade = AsyncMock()
            
            test_signal = {
                'symbol': 'BTCUSDT',
                'action': 'BUY',
                'confidence': 70,
                'timestamp': datetime.now().isoformat(),
                'source': 'tradingview'
            }
            
            await agent.process_webhook_signal(test_signal)
            
            # Verify trade execution was called
            agent._execute_trade.assert_called_once()
    
    async def test_brokerage_calculation(self):
        """Test brokerage cost calculation"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            decision = TradeDecision(
                action='BUY',
                symbol='BTCUSDT',
                quantity=0.1,
                price=45000,
                stop_loss=44000,
                take_profit=46000,
                confidence=75.0,
                strategy='test',
                reasoning='test',
                risk_reward_ratio=2.0
            )
            
            brokerage = agent._calculate_brokerage(decision)
            
            expected_brokerage = (0.1 * 45000) * 0.0005  # quantity * price * rate
            self.assertEqual(brokerage, expected_brokerage)
    
    async def test_performance_tracking(self):
        """Test performance tracking and metrics"""
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(self.test_config)
            
            # Simulate some trading activity
            agent.state.daily_pnl = 500
            agent.state.total_trades = 10
            agent.state.winning_trades = 7
            
            performance = agent.get_performance_summary()
            
            self.assertEqual(performance['daily_pnl'], 500)
            self.assertEqual(performance['total_trades'], 10)
            self.assertEqual(performance['win_rate'], 70.0)
            self.assertEqual(performance['trading_mode'], 'active')

class TestIntegration(unittest.TestCase):
    """Integration tests for complete AI Agent system"""
    
    async def test_full_trading_cycle(self):
        """Test complete trading cycle from analysis to execution"""
        
        config = {
            'delta_api': {'api_key': 'test', 'api_secret': 'test', 'testnet': True},
            'risk_management': {'max_daily_loss': 1000, 'daily_target': 2000},
            'min_confidence_threshold': 70,
            'enabled_coins': ['BTCUSDT'],
            'brokerage_rate': 0.0005
        }
        
        with patch('core.autonomous_agent.DeltaAPIClient'):
            agent = AutonomousAIAgent(config)
            
            # Mock all external dependencies
            agent.delta_client.get_price_data = AsyncMock(return_value={'current': 45000, 'history': [44000, 45000]})
            agent.option_chain_analyzer.analyze = AsyncMock(return_value={'delta': 0.6})
            agent.volume_scanner.scan = AsyncMock(return_value={'volatility': 0.3})
            agent.sentiment_analyzer.analyze = AsyncMock(return_value={'overall_score': 0.7})
            agent.market_regime_detector.detect = AsyncMock(return_value=MarketRegime.BULL)
            
            agent.strategy_engine.generate_strategies = AsyncMock(return_value=[{
                'name': 'test_strategy',
                'action': 'BUY',
                'stop_loss': 44000,
                'take_profit': 46000,
                'risk_level': 'medium',
                'reasoning': 'Test',
                'risk_reward_ratio': 2.0
            }])
            
            agent.confidence_calculator.calculate = AsyncMock(return_value=75.0)
            agent.position_sizer.calculate = AsyncMock(return_value=0.1)
            agent.risk_manager.validate_trade = Mock(return_value=True)
            agent.delta_client.place_order = AsyncMock(return_value={'success': True, 'order_id': 'test_123', 'executed_price': 45000})
            
            # Run one iteration of trading loop
            market_data = await agent._analyze_market_conditions()
            decisions = await agent._generate_trading_decisions(market_data)
            
            self.assertGreater(len(decisions), 0)
            
            # Execute the first decision
            if decisions:
                await agent._execute_trade(decisions[0])
                
                # Verify trade was recorded
                self.assertEqual(agent.state.total_trades, 1)
                self.assertIn('BTCUSDT', agent.state.current_positions)

async def run_simulation():
    """Run a trading simulation to test AI Agent behavior"""
    
    print("🚀 Starting AI Agent Simulation...")
    
    config = {
        'delta_api': {'api_key': 'test', 'api_secret': 'test', 'testnet': True},
        'risk_management': {
            'max_daily_loss': 1000,
            'daily_target': 2000,
            'max_position_size': 0.1,
            'max_simultaneous_trades': 3
        },
        'min_confidence_threshold': 70,
        'scan_interval': 5,  # Fast simulation
        'enabled_coins': ['BTCUSDT', 'ETHUSDT'],
        'brokerage_rate': 0.0005
    }
    
    with patch('core.autonomous_agent.DeltaAPIClient'):
        agent = AutonomousAIAgent(config)
        
        # Mock market data with some variability
        price_history = [45000, 45100, 44900, 45200, 45050]
        
        for i in range(5):  # Simulate 5 iterations
            print(f"\n📊 Simulation Step {i+1}")
            
            # Simulate changing market conditions
            current_price = price_history[i]
            volatility = 0.2 + (i * 0.1)  # Increasing volatility
            
            mock_market_data = {
                'BTCUSDT': {
                    'price': {'current': current_price, 'history': price_history[:i+1]},
                    'volume': {'volatility': volatility, 'volume_ratio': 1.0 + i * 0.2},
                    'sentiment': {'overall_score': 0.6 + i * 0.05, 'strength': 0.8},
                    'options': {'delta': 0.5 + i * 0.1, 'gamma': 0.1, 'theta': -0.05, 'iv': 0.25}
                },
                'regime': MarketRegime.BULL if i < 3 else MarketRegime.VOLATILE
            }
            
            # Mock API responses
            agent._analyze_market_conditions = AsyncMock(return_value=mock_market_data)
            
            # Mock strategy generation with varying confidence
            confidence = 80 - i * 5  # Decreasing confidence
            agent.strategy_engine.generate_strategies = AsyncMock(return_value=[{
                'name': f'strategy_{i}',
                'action': 'BUY' if i % 2 == 0 else 'SELL',
                'stop_loss': current_price * 0.98,
                'take_profit': current_price * 1.02,
                'risk_level': 'medium',
                'reasoning': f'Simulation step {i}',
                'risk_reward_ratio': 2.0
            }])
            
            agent.confidence_calculator.calculate = AsyncMock(return_value=confidence)
            agent.position_sizer.calculate = AsyncMock(return_value=0.05)
            agent.risk_manager.validate_trade = Mock(return_value=confidence >= 70)
            
            # Simulate trade execution
            if confidence >= 70:
                agent.delta_client.place_order = AsyncMock(return_value={
                    'success': True,
                    'order_id': f'sim_{i}',
                    'executed_price': current_price
                })
                
                # Simulate profit/loss
                profit = np.random.normal(50, 100)  # Random P&L
                agent.state.daily_pnl += profit
                agent.state.total_trades += 1
                
                if profit > 0:
                    agent.state.winning_trades += 1
                    agent.state.consecutive_losses = 0
                else:
                    agent.state.consecutive_losses += 1
                
                print(f"   💰 Trade executed: P&L = ₹{profit:.2f}")
            else:
                print(f"   ⏸️  Trade skipped: Confidence too low ({confidence:.1f}%)")
            
            # Check if should continue trading
            should_continue = agent._should_continue_trading()
            print(f"   📈 Daily P&L: ₹{agent.state.daily_pnl:.2f}")
            print(f"   🎯 Trading Mode: {agent.state.trading_mode.value}")
            print(f"   📊 Win Rate: {(agent.state.winning_trades/max(agent.state.total_trades,1)*100):.1f}%")
            
            if not should_continue:
                print("   🛑 Trading stopped due to risk limits")
                break
        
        # Final performance summary
        performance = agent.get_performance_summary()
        print(f"\n🏁 Simulation Complete!")
        print(f"   Total Trades: {performance['total_trades']}")
        print(f"   Win Rate: {performance['win_rate']:.1f}%")
        print(f"   Daily P&L: ₹{performance['daily_pnl']:.2f}")
        print(f"   Final Mode: {performance['trading_mode']}")

if __name__ == '__main__':
    # Run unit tests
    print("🧪 Running AI Agent Tests...")
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestAIAgent))
    test_suite.addTest(unittest.makeSuite(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Run simulation
    print("\n" + "="*50)
    asyncio.run(run_simulation())
    
    print("\n✅ All tests completed!")


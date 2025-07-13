import { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Settings,
  BarChart3,
  Brain,
  Shield,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const TradingDashboard = () => {
  const { user } = useAuth();
  const [tradingStatus, setTradingStatus] = useState(null);
  const [tradingConfig, setTradingConfig] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    fetchTradingData();
    const interval = setInterval(fetchTradingData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTradingData = async () => {
    try {
      const [statusRes, configRes, performanceRes] = await Promise.all([
        api.get('/trading/status'),
        api.get('/trading/config'),
        api.get('/trading/performance?period=7d')
      ]);

      setTradingStatus(statusRes.data.data);
      setTradingConfig(configRes.data.data);
      setPerformance(performanceRes.data.data);
    } catch (error) {
      console.error('Error fetching trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrading = async () => {
    setIsStarting(true);
    try {
      await api.post('/trading/start');
      await fetchTradingData();
    } catch (error) {
      console.error('Error starting trading:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTrading = async () => {
    setIsStopping(true);
    try {
      await api.post('/trading/stop', { reason: 'Manual stop by user' });
      await fetchTradingData();
    } catch (error) {
      console.error('Error stopping trading:', error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await api.post('/trading/emergency-stop', { reason: 'Emergency stop activated by user' });
      await fetchTradingData();
    } catch (error) {
      console.error('Error in emergency stop:', error);
    }
  };

  const toggleAIFeature = async (feature) => {
    try {
      const updatedToggles = {
        ...tradingConfig.aiToggles,
        [feature]: !tradingConfig.aiToggles[feature]
      };

      await api.put('/trading/config', {
        aiToggles: updatedToggles
      });

      await fetchTradingData();
    } catch (error) {
      console.error('Error toggling AI feature:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (tradingStatus?.emergencyStop) return 'text-red-600';
    if (tradingStatus?.isConnected && tradingStatus?.isActive) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusText = () => {
    if (tradingStatus?.emergencyStop) return 'Emergency Stop';
    if (tradingStatus?.isConnected && tradingStatus?.isActive) return 'Active Trading';
    if (tradingStatus?.isConnected) return 'Connected - Stopped';
    return 'Not Connected';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Trading Dashboard</h1>
          <p className="text-gray-600">Monitor and control your automated crypto trading</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Trading Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trading Status</p>
                <p className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${getStatusColor()}`} />
            </div>
          </div>

          {/* Daily P&L */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's P&L</p>
                <p className={`text-lg font-semibold ${
                  tradingStatus?.dailyStats?.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{tradingStatus?.dailyStats?.pnl?.toFixed(2) || '0.00'}
                </p>
              </div>
              {tradingStatus?.dailyStats?.pnl >= 0 ? 
                <TrendingUp className="h-8 w-8 text-green-600" /> :
                <TrendingDown className="h-8 w-8 text-red-600" />
              }
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate (7d)</p>
                <p className="text-lg font-semibold text-blue-600">
                  {performance?.winRate?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Total Trades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trades Today</p>
                <p className="text-lg font-semibold text-purple-600">
                  {tradingStatus?.dailyStats?.tradesCount || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading Controls</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Start/Stop Button */}
            {tradingStatus?.isActive ? (
              <button
                onClick={handleStopTrading}
                disabled={isStopping}
                className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Square className="h-5 w-5 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Trading'}
              </button>
            ) : (
              <button
                onClick={handleStartTrading}
                disabled={isStarting || !tradingStatus?.apiKeysConfigured || tradingStatus?.emergencyStop}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-5 w-5 mr-2" />
                {isStarting ? 'Starting...' : 'Start Trading'}
              </button>
            )}

            {/* Emergency Stop */}
            <button
              onClick={handleEmergencyStop}
              className="flex items-center px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Stop
            </button>
          </div>

          {/* Warnings */}
          {!tradingStatus?.apiKeysConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800">
                  Please configure your Delta API keys in settings to start trading.
                </p>
              </div>
            </div>
          )}

          {tradingStatus?.dailyStats?.lossLimitReached && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800">
                  Daily loss limit reached. Trading has been automatically stopped.
                </p>
              </div>
            </div>
          )}

          {tradingStatus?.capitalConservationMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-orange-600 mr-2" />
                <p className="text-orange-800">
                  Capital conservation mode is active. Position sizes are reduced.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Features Toggle Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-blue-600" />
            AI Strategy Controls
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tradingConfig?.aiToggles || {}).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 capitalize">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getFeatureDescription(feature)}
                  </p>
                </div>
                <button
                  onClick={() => toggleAIFeature(feature)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* P&L Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily P&L (7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performance?.dailyPnL || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'P&L']} />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total P&L (7d)</span>
                <span className={`font-semibold ${
                  performance?.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{performance?.totalPnL?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Win Rate</span>
                <span className="font-semibold text-blue-600">
                  {performance?.winRate?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sharpe Ratio</span>
                <span className="font-semibold text-purple-600">
                  {performance?.sharpeRatio?.toFixed(3) || '0.000'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Max Drawdown</span>
                <span className="font-semibold text-red-600">
                  ₹{performance?.maxDrawdown?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Profit Factor</span>
                <span className="font-semibold text-green-600">
                  {performance?.profitFactor?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Holding Time</span>
                <span className="font-semibold text-gray-900">
                  {performance?.avgHoldingTime?.toFixed(1) || '0.0'} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Coins */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Trading Pairs</h2>
          <div className="flex flex-wrap gap-2">
            {tradingStatus?.enabledCoins?.map((coin) => (
              <span
                key={coin}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {coin}
              </span>
            )) || (
              <p className="text-gray-500">No coins configured for trading</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getFeatureDescription = (feature) => {
  const descriptions = {
    volatilityScanner: 'Scans for high volatility opportunities',
    sentimentTrigger: 'Uses news sentiment for trade decisions',
    trailingStop: 'Automatically adjusts stop losses',
    profitOptimizer: 'Optimizes profit taking strategies',
    entryTimingFilter: 'Filters entry timing for better results',
    capitalConservationMode: 'Reduces risk during losses'
  };
  
  return descriptions[feature] || 'AI-powered trading feature';
};

export default TradingDashboard;


import { useState, useEffect } from 'react';
import { 
  Play, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  AlertCircle,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../lib/api';

const BacktestEngine = () => {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [selectedStrategy, setSelectedStrategy] = useState('momentum');
  const [timeframe, setTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const coins = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX'];
  const strategies = [
    { value: 'momentum', label: 'Momentum Strategy' },
    { value: 'mean_reversion', label: 'Mean Reversion' },
    { value: 'breakout', label: 'Breakout Strategy' },
    { value: 'scalping', label: 'Scalping' }
  ];
  const timeframes = [
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' }
  ];

  const runBacktest = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      // Simulate API call for backtest
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results
      const mockResults = {
        summary: {
          totalTrades: 156,
          winRate: 67.3,
          totalReturn: 23.45,
          maxDrawdown: -8.2,
          sharpeRatio: 1.84,
          profitFactor: 2.31,
          avgWin: 2.8,
          avgLoss: -1.9,
          avgHoldingTime: 4.2,
          startingCapital: 10000,
          endingCapital: 12345,
          totalFees: 234.56
        },
        trades: generateMockTrades(),
        equityCurve: generateMockEquityCurve(),
        monthlyReturns: generateMockMonthlyReturns(),
        drawdownCurve: generateMockDrawdownCurve()
      };
      
      setResults(mockResults);
    } catch (err) {
      setError('Failed to run backtest. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const generateMockTrades = () => {
    const trades = [];
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    
    for (let i = 0; i < 156; i++) {
      const entryTime = new Date(startTime + Math.random() * (endTime - startTime));
      const exitTime = new Date(entryTime.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      const pnl = (Math.random() - 0.3) * 500; // Bias towards positive
      
      trades.push({
        id: i + 1,
        entryTime: entryTime.toISOString(),
        exitTime: exitTime.toISOString(),
        entryPrice: 45000 + Math.random() * 10000,
        exitPrice: 45000 + Math.random() * 10000,
        quantity: 0.01 + Math.random() * 0.05,
        pnl: pnl,
        pnlPercentage: (pnl / 1000) * 100,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        strategy: selectedStrategy
      });
    }
    
    return trades.sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  };

  const generateMockEquityCurve = () => {
    const data = [];
    let equity = 10000;
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
      equity += (Math.random() - 0.4) * 100; // Slight upward bias
      
      data.push({
        date: date.toISOString().split('T')[0],
        equity: Math.max(equity, 5000) // Don't go below 5000
      });
    }
    
    return data;
  };

  const generateMockMonthlyReturns = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      return: (Math.random() - 0.3) * 20 // -6% to +14% range
    }));
  };

  const generateMockDrawdownCurve = () => {
    const data = [];
    let peak = 10000;
    let current = 10000;
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
      current += (Math.random() - 0.4) * 100;
      
      if (current > peak) {
        peak = current;
      }
      
      const drawdown = ((current - peak) / peak) * 100;
      
      data.push({
        date: date.toISOString().split('T')[0],
        drawdown: Math.min(drawdown, 0)
      });
    }
    
    return data;
  };

  const exportResults = () => {
    if (!results) return;
    
    const csvContent = [
      ['Trade ID', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Quantity', 'P&L', 'P&L %', 'Side'],
      ...results.trades.map(trade => [
        trade.id,
        trade.entryTime,
        trade.exitTime,
        trade.entryPrice.toFixed(2),
        trade.exitPrice.toFixed(2),
        trade.quantity.toFixed(4),
        trade.pnl.toFixed(2),
        trade.pnlPercentage.toFixed(2),
        trade.side
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_${selectedCoin}_${selectedStrategy}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Backtest Engine</h1>
          <p className="text-gray-600">Test your trading strategies on historical data</p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Backtest Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            {/* Coin Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Coin
              </label>
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {coins.map(coin => (
                  <option key={coin} value={coin}>{coin}</option>
                ))}
              </select>
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strategy
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {strategies.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeframes.map(tf => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-between items-center">
            <button
              onClick={runBacktest}
              disabled={isRunning}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-5 w-5 mr-2" />
              {isRunning ? 'Running Backtest...' : 'Run Backtest'}
            </button>

            {results && (
              <button
                onClick={exportResults}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Return</p>
                    <p className={`text-2xl font-bold ${
                      results.summary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {results.summary.totalReturn.toFixed(2)}%
                    </p>
                  </div>
                  {results.summary.totalReturn >= 0 ? 
                    <TrendingUp className="h-8 w-8 text-green-600" /> :
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  }
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {results.summary.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {results.summary.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
                    <p className="text-2xl font-bold text-red-600">
                      {results.summary.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Equity Curve */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Equity Curve</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={results.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Equity']} />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#3B82F6" 
                      fill="#3B82F6" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Drawdown Curve */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Drawdown Curve</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={results.drawdownCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Drawdown']} />
                    <Area 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#EF4444" 
                      fill="#EF4444" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Performance Metrics */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Trades</span>
                    <span className="font-semibold">{results.summary.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Factor</span>
                    <span className="font-semibold">{results.summary.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Win</span>
                    <span className="font-semibold text-green-600">
                      {results.summary.avgWin.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Loss</span>
                    <span className="font-semibold text-red-600">
                      {results.summary.avgLoss.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Holding Time</span>
                    <span className="font-semibold">{results.summary.avgHoldingTime.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Fees</span>
                    <span className="font-semibold">₹{results.summary.totalFees.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Returns */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={results.monthlyReturns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Return']} />
                    <Area 
                      type="monotone" 
                      dataKey="return" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trade ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P&L
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P&L %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.trades.slice(-10).reverse().map((trade) => (
                      <tr key={trade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{trade.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(trade.entryTime).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            trade.side === 'BUY' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{trade.entryPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{trade.exitPrice.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{trade.pnl.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          trade.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.pnlPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BacktestEngine;


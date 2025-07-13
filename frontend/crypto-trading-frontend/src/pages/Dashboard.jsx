import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Play,
  Pause,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatPercentage, getPnLColor } from '../lib/utils';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradingActive, setTradingActive] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/dashboard');
      setDashboardData(response.data.data);
      setTradingActive(response.data.data.user.tradingActive);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrading = async () => {
    try {
      const response = await api.post('/user/toggle-trading', {
        tradingActive: !tradingActive
      });
      setTradingActive(!tradingActive);
    } catch (error) {
      console.error('Failed to toggle trading:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const stats = dashboardData?.stats || {};
  const recentTrades = dashboardData?.recentTrades || [];
  const activeTrades = dashboardData?.activeTrades || [];

  // Mock chart data
  const pnlChartData = [
    { date: '2024-01-01', pnl: 100 },
    { date: '2024-01-02', pnl: 250 },
    { date: '2024-01-03', pnl: 180 },
    { date: '2024-01-04', pnl: 420 },
    { date: '2024-01-05', pnl: 380 },
    { date: '2024-01-06', pnl: 550 },
    { date: '2024-01-07', pnl: 490 },
  ];

  const strategyData = [
    { name: 'Volatility Scanner', trades: 45, pnl: 1250 },
    { name: 'Sentiment Trigger', trades: 32, pnl: 890 },
    { name: 'Technical Analysis', trades: 28, pnl: 650 },
    { name: 'ML Predictor', trades: 15, pnl: 420 },
  ];

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {user?.name}! Here's your trading overview.
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {user?.deltaConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.deltaConnected ? 'Delta Connected' : 'Not Connected'}
            </span>
          </div>
          
          {/* Trading Toggle */}
          <Button
            onClick={toggleTrading}
            variant={tradingActive ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            {tradingActive ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Stop Trading</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Trading</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(stats.totalPnL || 0)}`}>
              {formatCurrency(stats.totalPnL || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(dashboardData?.todayPnL || 0)}`}>
              {formatCurrency(dashboardData?.todayPnL || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTrades.length} active trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(stats.winRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.winningTrades || 0} / {stats.totalTrades || 0} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTrades || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Chart */}
        <Card>
          <CardHeader>
            <CardTitle>P&L Trend</CardTitle>
            <CardDescription>
              Your profit and loss over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Strategy Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
            <CardDescription>
              Performance by AI strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pnl" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades and Active Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>
              Your latest trading activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrades.length > 0 ? (
                recentTrades.slice(0, 5).map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                        {trade.side}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-gray-500">{trade.strategy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${getPnLColor(trade.pnl)}`}>
                        {formatCurrency(trade.pnl)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(trade.executedPrice)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No recent trades
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Active Trades</CardTitle>
            <CardDescription>
              Currently open positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrades.length > 0 ? (
                activeTrades.map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">
                        {trade.side}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-gray-500">{trade.strategy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(trade.price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {trade.quantity}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No active trades
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;


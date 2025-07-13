import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { formatCurrency, formatPercentage, getPnLColor, formatRelativeTime } from '../lib/utils';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Trading = () => {
  const [tradingData, setTradingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradingActive, setTradingActive] = useState(false);

  useEffect(() => {
    fetchTradingData();
  }, []);

  const fetchTradingData = async () => {
    try {
      const response = await api.get('/trading/overview');
      setTradingData(response.data.data);
      setTradingActive(response.data.data.user.tradingActive);
    } catch (error) {
      console.error('Failed to fetch trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrading = async () => {
    try {
      await api.post('/user/toggle-trading', {
        tradingActive: !tradingActive
      });
      setTradingActive(!tradingActive);
    } catch (error) {
      console.error('Failed to toggle trading:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading trading data..." />;
  }

  const activeTrades = tradingData?.activeTrades || [];
  const recentTrades = tradingData?.recentTrades || [];
  const signals = tradingData?.signals || [];

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Trading
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and control your AI trading activities
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2">
            <Label htmlFor="trading-toggle">AI Trading</Label>
            <Switch
              id="trading-toggle"
              checked={tradingActive}
              onCheckedChange={toggleTrading}
            />
          </div>
          
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

      {/* Trading Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${tradingActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Trading Status: {tradingActive ? 'Active' : 'Inactive'}</span>
          </CardTitle>
          <CardDescription>
            {tradingActive 
              ? 'AI is actively monitoring markets and executing trades'
              : 'Trading is paused. Enable to start automated trading'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{activeTrades.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Trades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{signals.filter(s => s.action === 'BUY').length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Buy Signals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{signals.filter(s => s.action === 'SELL').length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sell Signals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{recentTrades.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Trades</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Trades</TabsTrigger>
          <TabsTrigger value="signals">AI Signals</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        {/* Active Trades */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Trades</CardTitle>
              <CardDescription>
                Currently open positions managed by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTrades.length > 0 ? (
                <div className="space-y-4">
                  {activeTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                          {trade.side}
                        </Badge>
                        <div>
                          <p className="font-semibold">{trade.symbol}</p>
                          <p className="text-sm text-gray-500">{trade.strategy}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Entry Price</p>
                          <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Current Price</p>
                          <p className="font-medium">{formatCurrency(trade.currentPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Quantity</p>
                          <p className="font-medium">{trade.quantity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Unrealized P&L</p>
                          <p className={`font-medium ${getPnLColor(trade.unrealizedPnL)}`}>
                            {formatCurrency(trade.unrealizedPnL)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Duration</p>
                          <p className="font-medium">{formatRelativeTime(trade.entryTime)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active trades</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {tradingActive ? 'AI is monitoring for opportunities' : 'Enable trading to start'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Signals */}
        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Trading Signals</CardTitle>
              <CardDescription>
                Latest signals generated by AI strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length > 0 ? (
                <div className="space-y-4">
                  {signals.map((signal, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {signal.action === 'BUY' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                          <Badge variant={signal.action === 'BUY' ? 'default' : 'destructive'}>
                            {signal.action}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-semibold">{signal.symbol}</p>
                          <p className="text-sm text-gray-500">{signal.strategy}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Price</p>
                          <p className="font-medium">{formatCurrency(signal.price)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Confidence</p>
                          <p className="font-medium">{formatPercentage(signal.confidence * 100)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Priority</p>
                          <Badge variant={
                            signal.priority === 'HIGH' ? 'destructive' : 
                            signal.priority === 'MEDIUM' ? 'default' : 'secondary'
                          }>
                            {signal.priority}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Time</p>
                          <p className="font-medium">{formatRelativeTime(signal.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent signals</p>
                  <p className="text-sm text-gray-400 mt-1">
                    AI will generate signals when opportunities are detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                Recent completed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTrades.length > 0 ? (
                <div className="space-y-4">
                  {recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                          {trade.side}
                        </Badge>
                        <div>
                          <p className="font-semibold">{trade.symbol}</p>
                          <p className="text-sm text-gray-500">{trade.strategy}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Entry</p>
                          <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Exit</p>
                          <p className="font-medium">{formatCurrency(trade.exitPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Quantity</p>
                          <p className="font-medium">{trade.quantity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">P&L</p>
                          <p className={`font-medium ${getPnLColor(trade.pnl)}`}>
                            {formatCurrency(trade.pnl)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Duration</p>
                          <p className="font-medium">
                            {Math.round((new Date(trade.exitTime) - new Date(trade.entryTime)) / (1000 * 60))}m
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trade history</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Completed trades will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Trading;


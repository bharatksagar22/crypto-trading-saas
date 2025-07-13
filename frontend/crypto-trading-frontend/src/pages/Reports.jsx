import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  FileText,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatPercentage, getPnLColor, formatDate } from '../lib/utils';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Reports = () => {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    try {
      const [pnlResponse, strategyResponse, coinResponse, metricsResponse] = await Promise.all([
        api.get(`/reports/pnl?period=${selectedPeriod}`),
        api.get(`/reports/strategy-performance?period=${selectedPeriod}`),
        api.get(`/reports/coin-performance?period=${selectedPeriod}`),
        api.get(`/reports/metrics?period=${selectedPeriod}`)
      ]);

      setReportsData({
        pnl: pnlResponse.data.data,
        strategies: strategyResponse.data.data,
        coins: coinResponse.data.data,
        metrics: metricsResponse.data.data
      });
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type = 'monthly', format = 'pdf') => {
    setGeneratingReport(true);
    try {
      const response = await api.post('/reports/generate', {
        reportType: type,
        format
      });
      
      // Handle download or show success message
      console.log('Report generated:', response.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const sendDailyReport = async () => {
    try {
      await api.post('/reports/send-daily');
      // Show success message
    } catch (error) {
      console.error('Failed to send daily report:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading reports..." />;
  }

  const pnlData = reportsData?.pnl?.pnlData || [];
  const strategies = reportsData?.strategies?.strategies || [];
  const coins = reportsData?.coins?.coins || [];
  const metrics = reportsData?.metrics?.metrics || {};

  // Chart colors
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive trading performance analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => generateReport('monthly', 'pdf')}
            disabled={generatingReport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(metrics.totalPnL || 0)}`}>
              {formatCurrency(metrics.totalPnL || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metrics.winRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.winningTrades || 0} / {metrics.totalTrades || 0} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.sharpeRatio || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.maxDrawdown || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum loss
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pnl">P&L Analysis</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Performance</TabsTrigger>
          <TabsTrigger value="coins">Asset Performance</TabsTrigger>
          <TabsTrigger value="reports">Generated Reports</TabsTrigger>
        </TabsList>

        {/* P&L Analysis */}
        <TabsContent value="pnl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>P&L Trend</CardTitle>
              <CardDescription>
                Daily and cumulative profit/loss over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="dailyPnL" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Daily P&L"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativePnL" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Cumulative P&L"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily P&L Distribution</CardTitle>
                <CardDescription>
                  Distribution of daily profits and losses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pnlData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="dailyPnL" 
                      fill={(entry) => entry.dailyPnL >= 0 ? '#10b981' : '#ef4444'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key trading performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Trades</span>
                    <span className="font-medium">{metrics.totalTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Best Trade</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(metrics.bestTrade || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Worst Trade</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(metrics.worstTrade || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average P&L</span>
                    <span className={`font-medium ${getPnLColor(metrics.avgPnL || 0)}`}>
                      {formatCurrency(metrics.avgPnL || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Profit Factor</span>
                    <span className="font-medium">
                      {(metrics.profitFactor || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strategy Performance */}
        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance Comparison</CardTitle>
              <CardDescription>
                Performance breakdown by AI strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={strategies}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategyName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalPnL" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strategy Details</CardTitle>
              <CardDescription>
                Detailed performance metrics for each strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{strategy.strategyName}</h3>
                      <Badge variant={strategy.totalPnL >= 0 ? 'default' : 'destructive'}>
                        {formatCurrency(strategy.totalPnL)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Trades</p>
                        <p className="font-medium">{strategy.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Win Rate</p>
                        <p className="font-medium">{formatPercentage(strategy.winRate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Confidence</p>
                        <p className="font-medium">{formatPercentage(strategy.avgConfidence)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Volume</p>
                        <p className="font-medium">{formatCurrency(strategy.totalVolume)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Performance */}
        <TabsContent value="coins" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset P&L Distribution</CardTitle>
                <CardDescription>
                  Profit/loss breakdown by cryptocurrency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={coins}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ symbol, totalPnL }) => `${symbol}: ${formatCurrency(totalPnL)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalPnL"
                    >
                      {coins.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Performance</CardTitle>
                <CardDescription>
                  Trading performance by asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={coins}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalPnL" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>
                Detailed performance metrics for each asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coins.map((coin, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{coin.symbol}</h3>
                      <Badge variant={coin.totalPnL >= 0 ? 'default' : 'destructive'}>
                        {formatCurrency(coin.totalPnL)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Trades</p>
                        <p className="font-medium">{coin.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Win Rate</p>
                        <p className="font-medium">{formatPercentage(coin.winRate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg P&L</p>
                        <p className={`font-medium ${getPnLColor(coin.avgPnL)}`}>
                          {formatCurrency(coin.avgPnL)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Volume</p>
                        <p className="font-medium">{formatCurrency(coin.totalVolume)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Reports */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Generation</CardTitle>
              <CardDescription>
                Generate and download comprehensive trading reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => generateReport('daily', 'pdf')}
                  disabled={generatingReport}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Daily Report (PDF)</span>
                </Button>
                
                <Button
                  onClick={() => generateReport('weekly', 'pdf')}
                  disabled={generatingReport}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Weekly Report (PDF)</span>
                </Button>
                
                <Button
                  onClick={() => generateReport('monthly', 'csv')}
                  disabled={generatingReport}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Monthly Data (CSV)</span>
                </Button>
              </div>
              
              <div className="mt-6">
                <Button
                  onClick={sendDailyReport}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Daily Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reports generated yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Generated reports will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;


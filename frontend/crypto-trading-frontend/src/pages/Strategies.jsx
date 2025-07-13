import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Shield, Zap, Settings, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { formatPercentage, formatCurrency } from '../lib/utils';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Strategies = () => {
  const [strategiesData, setStrategiesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategiesData();
  }, []);

  const fetchStrategiesData = async () => {
    try {
      const response = await api.get('/strategies/overview');
      setStrategiesData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch strategies data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (strategyName, enabled) => {
    try {
      await api.post('/strategies/toggle', {
        strategyName,
        enabled
      });
      
      // Update local state
      setStrategiesData(prev => ({
        ...prev,
        userStrategies: {
          ...prev.userStrategies,
          [strategyName]: enabled
        }
      }));
    } catch (error) {
      console.error('Failed to toggle strategy:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading AI strategies..." />;
  }

  const availableStrategies = strategiesData?.availableStrategies || [];
  const userStrategies = strategiesData?.userStrategies || {};
  const performance = strategiesData?.performance || {};

  const strategyCategories = {
    'Technical': availableStrategies.filter(s => s.category === 'Technical'),
    'Risk Management': availableStrategies.filter(s => s.category === 'Risk Management'),
    'Machine Learning': availableStrategies.filter(s => s.category === 'Machine Learning'),
    'Advanced': availableStrategies.filter(s => s.category === 'Advanced')
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'High': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Strategies
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure and monitor your AI trading strategies
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>{Object.values(userStrategies).filter(Boolean).length} Active</span>
          </Badge>
        </div>
      </div>

      {/* Strategy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(userStrategies).filter(Boolean).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {availableStrategies.length} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(performance.totalPnL || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(performance.winRate || 0)} win rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Medium</div>
            <p className="text-xs text-muted-foreground">
              Based on active strategies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Strategies</TabsTrigger>
          <TabsTrigger value="active">Active Only</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* All Strategies */}
        <TabsContent value="all" className="space-y-6">
          {Object.entries(strategyCategories).map(([category, strategies]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {category === 'Technical' && <TrendingUp className="h-5 w-5" />}
                  {category === 'Risk Management' && <Shield className="h-5 w-5" />}
                  {category === 'Machine Learning' && <Brain className="h-5 w-5" />}
                  {category === 'Advanced' && <Zap className="h-5 w-5" />}
                  <span>{category}</span>
                </CardTitle>
                <CardDescription>
                  {category === 'Technical' && 'Strategies based on technical analysis and market indicators'}
                  {category === 'Risk Management' && 'Strategies focused on protecting your capital'}
                  {category === 'Machine Learning' && 'AI-powered strategies that learn and adapt'}
                  {category === 'Advanced' && 'Sophisticated strategies for experienced traders'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {strategies.map((strategy) => (
                    <div key={strategy.name} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold">{strategy.display_name}</h3>
                          <Badge className={getRiskColor(strategy.risk_level)}>
                            {strategy.risk_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {strategy.description}
                        </p>
                        {performance[strategy.name] && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Signals: {performance[strategy.name].signals || 0}</span>
                            <span>Win Rate: {formatPercentage(performance[strategy.name].winRate || 0)}</span>
                            <span>P&L: {formatCurrency(performance[strategy.name].pnl || 0)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Show strategy details modal
                            console.log('Show details for', strategy.name);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`strategy-${strategy.name}`} className="text-sm">
                            {userStrategies[strategy.name] ? 'On' : 'Off'}
                          </Label>
                          <Switch
                            id={`strategy-${strategy.name}`}
                            checked={userStrategies[strategy.name] || false}
                            onCheckedChange={(checked) => toggleStrategy(strategy.name, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Active Strategies */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Strategies</CardTitle>
              <CardDescription>
                Currently enabled AI trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableStrategies
                  .filter(strategy => userStrategies[strategy.name])
                  .map((strategy) => (
                    <div key={strategy.name} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold">{strategy.display_name}</h3>
                          <Badge variant="default">Active</Badge>
                          <Badge className={getRiskColor(strategy.risk_level)}>
                            {strategy.risk_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {strategy.description}
                        </p>
                        {performance[strategy.name] && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Signals Generated</p>
                              <p className="font-medium">{performance[strategy.name].signals || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Success Rate</p>
                              <p className="font-medium">{formatPercentage(performance[strategy.name].winRate || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total P&L</p>
                              <p className={`font-medium ${performance[strategy.name].pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(performance[strategy.name].pnl || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Confidence</p>
                              <div className="flex items-center space-x-2">
                                <Progress value={performance[strategy.name].confidence || 50} className="flex-1" />
                                <span className="text-xs">{Math.round(performance[strategy.name].confidence || 50)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Show strategy settings
                            console.log('Show settings for', strategy.name);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        <Switch
                          checked={true}
                          onCheckedChange={(checked) => toggleStrategy(strategy.name, checked)}
                        />
                      </div>
                    </div>
                  ))}
                
                {availableStrategies.filter(strategy => userStrategies[strategy.name]).length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No active strategies</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Enable strategies from the "All Strategies" tab
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance Comparison</CardTitle>
              <CardDescription>
                Compare the performance of different AI strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(performance).map(([strategyName, perf]) => {
                  const strategy = availableStrategies.find(s => s.name === strategyName);
                  if (!strategy) return null;
                  
                  return (
                    <div key={strategyName} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{strategy.display_name}</h3>
                          <p className="text-sm text-gray-500">{strategy.category}</p>
                        </div>
                        <Badge className={getRiskColor(strategy.risk_level)}>
                          {strategy.risk_level}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Total Signals</p>
                          <p className="text-xl font-bold">{perf.signals || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Win Rate</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatPercentage(perf.winRate || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Total P&L</p>
                          <p className={`text-xl font-bold ${perf.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(perf.pnl || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Avg P&L</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(perf.avgPnL || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Confidence</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={perf.confidence || 50} className="flex-1" />
                            <span className="text-sm font-medium">{Math.round(perf.confidence || 50)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(performance).length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No performance data available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Performance data will appear after strategies generate signals
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Strategies;


import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  Server
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatCurrency, formatNumber } from '../../lib/utils';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (confirm('Are you sure you want to stop all trading activities? This will affect all users.')) {
      try {
        await api.post('/admin/emergency-stop');
        // Refresh dashboard data
        fetchDashboardData();
      } catch (error) {
        console.error('Failed to execute emergency stop:', error);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading admin dashboard..." />;
  }

  const stats = dashboardData?.stats || {};
  const recentUsers = dashboardData?.recentUsers || [];
  const systemHealth = dashboardData?.systemHealth || {};

  // Mock chart data
  const userGrowthData = [
    { month: 'Jan', users: 120 },
    { month: 'Feb', users: 180 },
    { month: 'Mar', users: 250 },
    { month: 'Apr', users: 320 },
    { month: 'May', users: 420 },
    { month: 'Jun', users: 580 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 12000 },
    { month: 'Feb', revenue: 18000 },
    { month: 'Mar', revenue: 25000 },
    { month: 'Apr', revenue: 32000 },
    { month: 'May', revenue: 42000 },
    { month: 'Jun', revenue: 58000 },
  ];

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System overview and management controls
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
            System {systemHealth.status || 'Unknown'}
          </Badge>
          
          <Button
            onClick={handleEmergencyStop}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Emergency Stop</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalUsers || 0, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersToday || 0} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Traders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.activeTraders || 0, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeTraders / stats.totalUsers) * 100 || 0).toFixed(1)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.revenueGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalTrades || 0, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.tradesToday || 0, 0)} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>
              Monthly user registration trend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>
              Monthly revenue trend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health and Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Health</span>
            </CardTitle>
            <CardDescription>
              Current system status and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response Time</span>
                <Badge variant="outline">
                  {systemHealth.apiResponseTime || '120ms'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Status</span>
                <Badge variant={systemHealth.databaseStatus === 'healthy' ? 'default' : 'destructive'}>
                  {systemHealth.databaseStatus || 'Healthy'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Engine Status</span>
                <Badge variant={systemHealth.aiEngineStatus === 'running' ? 'default' : 'destructive'}>
                  {systemHealth.aiEngineStatus || 'Running'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Connections</span>
                <span className="font-medium">
                  {systemHealth.activeConnections || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Memory Usage</span>
                <span className="font-medium">
                  {systemHealth.memoryUsage || '65%'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">CPU Usage</span>
                <span className="font-medium">
                  {systemHealth.cpuUsage || '45%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Latest user registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length > 0 ? (
                recentUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {user.subscriptionPlan?.toUpperCase() || 'FREE'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No recent users
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <DollarSign className="h-6 w-6" />
              <span>View Revenue</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <Server className="h-6 w-6" />
              <span>System Logs</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <AlertTriangle className="h-6 w-6" />
              <span>Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;


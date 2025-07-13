import { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  Key,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/user/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings) => {
    setSaving(true);
    try {
      const response = await api.put('/user/settings', updatedSettings);
      setSettings(response.data.data);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (profileData) => {
    setSaving(true);
    try {
      const response = await api.put('/user/profile', profileData);
      updateUser(response.data.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  const riskSettings = settings?.riskSettings || {};
  const aiStrategies = settings?.aiStrategies || {};
  const notifications = settings?.notifications || {};

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account and trading preferences
          </p>
        </div>
        
        <Badge variant="outline" className="mt-4 sm:mt-0">
          {user?.subscriptionPlan?.toUpperCase() || 'FREE'} Plan
        </Badge>
      </div>

      {/* Message Alert */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  defaultValue={user?.phone}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <Button
                onClick={() => {
                  const name = document.getElementById('name').value;
                  const email = document.getElementById('email').value;
                  const phone = document.getElementById('phone').value;
                  handleProfileUpdate({ name, email, phone });
                }}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
              
              <Button variant="outline">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Management */}
        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Management Settings</span>
              </CardTitle>
              <CardDescription>
                Configure your trading risk parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Daily Loss Cap</Label>
                    <div className="mt-2">
                      <Input
                        type="number"
                        defaultValue={riskSettings.dailyLossCap || 1000}
                        placeholder="1000"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum loss allowed per day (USD)
                    </p>
                  </div>
                  
                  <div>
                    <Label>Max Trades Per Day</Label>
                    <div className="mt-2">
                      <Slider
                        defaultValue={[riskSettings.maxTradeCountPerDay || 10]}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of trades per day
                    </p>
                  </div>
                  
                  <div>
                    <Label>Max Trade Size (%)</Label>
                    <div className="mt-2">
                      <Slider
                        defaultValue={[riskSettings.maxTradeSizePercent || 5]}
                        max={20}
                        min={1}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum percentage of portfolio per trade
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Stop Loss (%)</Label>
                    <div className="mt-2">
                      <Slider
                        defaultValue={[riskSettings.stopLossPercentage * 100 || 2]}
                        max={10}
                        min={0.5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatic stop loss percentage
                    </p>
                  </div>
                  
                  <div>
                    <Label>Take Profit (%)</Label>
                    <div className="mt-2">
                      <Slider
                        defaultValue={[riskSettings.takeProfitPercentage * 100 || 4]}
                        max={20}
                        min={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatic take profit percentage
                    </p>
                  </div>
                  
                  <div>
                    <Label>Max Concurrent Trades</Label>
                    <div className="mt-2">
                      <Slider
                        defaultValue={[riskSettings.maxConcurrentTrades || 5]}
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of open positions
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="trailingStopLoss"
                  defaultChecked={riskSettings.trailingStopLossEnabled}
                />
                <Label htmlFor="trailingStopLoss">Enable Trailing Stop Loss</Label>
              </div>
              
              <Button
                onClick={() => {
                  // Collect all risk settings and update
                  console.log('Update risk settings');
                }}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Risk Settings'}</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive trading updates via email
                    </p>
                  </div>
                  <Switch defaultChecked={notifications.emailNotifications} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Trade Execution Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when trades are executed
                    </p>
                  </div>
                  <Switch defaultChecked={notifications.tradeAlerts} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Reports</Label>
                    <p className="text-sm text-gray-500">
                      Receive daily performance summaries
                    </p>
                  </div>
                  <Switch defaultChecked={notifications.dailyReports} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Risk Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified about risk threshold breaches
                    </p>
                  </div>
                  <Switch defaultChecked={notifications.riskAlerts} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Maintenance</Label>
                    <p className="text-sm text-gray-500">
                      Notifications about system updates and maintenance
                    </p>
                  </div>
                  <Switch defaultChecked={notifications.systemAlerts} />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Notification Frequency</Label>
                <Select defaultValue={notifications.frequency || 'immediate'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => {
                  // Update notification settings
                  console.log('Update notification settings');
                }}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Notification Settings'}</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your exchange API keys for trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Delta Exchange API Key</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter your Delta API key"
                      defaultValue={settings?.deltaApiKey ? '••••••••••••••••' : ''}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Delta Exchange API Secret</Label>
                  <div className="mt-2">
                    <Input
                      type="password"
                      placeholder="Enter your Delta API secret"
                      defaultValue={settings?.deltaApiSecret ? '••••••••••••••••' : ''}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                        Security Notice
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Your API keys are encrypted and stored securely. Never share your API keys with anyone.
                        Make sure to enable IP whitelisting on your exchange account.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="testMode" defaultChecked={settings?.testMode} />
                  <Label htmlFor="testMode">Test Mode (Paper Trading)</Label>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    // Test API connection
                    console.log('Test API connection');
                  }}
                  variant="outline"
                >
                  Test Connection
                </Button>
                
                <Button
                  onClick={() => {
                    // Save API keys
                    console.log('Save API keys');
                  }}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save API Keys'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Subscription Plan</span>
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold">Current Plan</h3>
                  <p className="text-sm text-gray-500">
                    {user?.subscriptionPlan?.toUpperCase() || 'FREE'} Plan
                  </p>
                </div>
                <Badge variant="outline">
                  {user?.subscriptionStatus || 'Active'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold">Free</h4>
                  <p className="text-2xl font-bold mt-2">$0<span className="text-sm font-normal">/month</span></p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-1">
                    <li>• Basic AI strategies</li>
                    <li>• 5 trades per day</li>
                    <li>• Email support</li>
                  </ul>
                  <Button variant="outline" className="w-full mt-4" disabled>
                    Current Plan
                  </Button>
                </div>
                
                <div className="p-4 border-2 border-blue-500 rounded-lg relative">
                  <Badge className="absolute -top-2 left-4">Popular</Badge>
                  <h4 className="font-semibold">Pro</h4>
                  <p className="text-2xl font-bold mt-2">$29<span className="text-sm font-normal">/month</span></p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-1">
                    <li>• All AI strategies</li>
                    <li>• Unlimited trades</li>
                    <li>• Advanced analytics</li>
                    <li>• Priority support</li>
                  </ul>
                  <Button className="w-full mt-4">
                    Upgrade to Pro
                  </Button>
                </div>
                
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold">Enterprise</h4>
                  <p className="text-2xl font-bold mt-2">$99<span className="text-sm font-normal">/month</span></p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-1">
                    <li>• Custom strategies</li>
                    <li>• API access</li>
                    <li>• Dedicated support</li>
                    <li>• White-label option</li>
                  </ul>
                  <Button variant="outline" className="w-full mt-4">
                    Contact Sales
                  </Button>
                </div>
              </div>
              
              {user?.subscriptionPlan !== 'free' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">Billing Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Next billing date:</span>
                      <span>{user?.nextBillingDate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment method:</span>
                      <span>•••• •••• •••• 1234</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm">
                      Update Payment Method
                    </Button>
                    <Button variant="outline" size="sm">
                      Download Invoice
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;


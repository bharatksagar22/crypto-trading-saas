import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Ban,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { formatDate, formatCurrency } from '../../lib/utils';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'ban':
          await api.put(`/admin/users/${userId}`, { status: 'banned' });
          break;
        case 'activate':
          await api.put(`/admin/users/${userId}`, { status: 'active' });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this user?')) {
            await api.delete(`/admin/users/${userId}`);
          }
          break;
        case 'toggle-trading':
          await api.post(`/admin/users/${userId}/toggle-trading`);
          break;
      }
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || user.subscriptionPlan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return <LoadingSpinner text="Loading users..." />;
  }

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        
        <Badge variant="outline" className="mt-4 sm:mt-0">
          {filteredUsers.length} Users
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Users ({filteredUsers.length})</span>
          </CardTitle>
          <CardDescription>
            Manage user accounts, subscriptions, and trading permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                        {user.status}
                      </Badge>
                      <Badge variant="outline">
                        {user.subscriptionPlan?.toUpperCase() || 'FREE'}
                      </Badge>
                      {user.tradingActive && (
                        <Badge variant="secondary">Trading Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total P&L</p>
                    <p className={`font-medium ${user.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(user.totalPnL || 0)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Trades</p>
                    <p className="font-medium">{user.totalTrades || 0}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'edit')}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'toggle-trading')}>
                        {user.tradingActive ? (
                          <>
                            <Ban className="h-4 w-4 mr-2" />
                            Disable Trading
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Enable Trading
                          </>
                        )}
                      </DropdownMenuItem>
                      
                      {user.status === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => handleUserAction(user._id, 'ban')}
                          className="text-red-600"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Ban User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUserAction(user._id, 'activate')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate User
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem 
                        onClick={() => handleUserAction(user._id, 'delete')}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;


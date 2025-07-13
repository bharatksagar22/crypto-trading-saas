import { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { formatDate, formatPercentage } from '../../lib/utils';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/admin/coupons');
      setCoupons(response.data.data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (couponData) => {
    try {
      await api.post('/admin/coupons', couponData);
      fetchCoupons();
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create coupon:', error);
    }
  };

  const handleUpdateCoupon = async (couponId, couponData) => {
    try {
      await api.put(`/admin/coupons/${couponId}`, couponData);
      fetchCoupons();
      setEditingCoupon(null);
    } catch (error) {
      console.error('Failed to update coupon:', error);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      try {
        await api.delete(`/admin/coupons/${couponId}`);
        fetchCoupons();
      } catch (error) {
        console.error('Failed to delete coupon:', error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show success message
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner text="Loading coupons..." />;
  }

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Coupon Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage discount coupons
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Create a new discount coupon for users
              </DialogDescription>
            </DialogHeader>
            <CouponForm onSubmit={handleCreateCoupon} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search coupons by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Coupons ({filteredCoupons.length})</span>
          </CardTitle>
          <CardDescription>
            Manage discount coupons and promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCoupons.map((coupon) => (
              <div key={coupon._id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold font-mono">{coupon.code}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(coupon.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">{coupon.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">
                        {coupon.discountType === 'percentage' 
                          ? formatPercentage(coupon.discountValue)
                          : `$${coupon.discountValue}`
                        }
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Used</p>
                    <p className="font-medium">
                      {coupon.usedCount || 0}
                      {coupon.maxUses && ` / ${coupon.maxUses}`}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Expires</p>
                    <p className="font-medium">
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(coupon.createdAt)}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCoupon(coupon)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Coupon
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => copyToClipboard(coupon.code)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCoupon(coupon._id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Coupon
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            
            {filteredCoupons.length === 0 && (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No coupons found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first coupon to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Coupon Dialog */}
      {editingCoupon && (
        <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Coupon</DialogTitle>
              <DialogDescription>
                Update coupon details
              </DialogDescription>
            </DialogHeader>
            <CouponForm 
              coupon={editingCoupon}
              onSubmit={(data) => handleUpdateCoupon(editingCoupon._id, data)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Coupon Form Component
const CouponForm = ({ coupon, onSubmit }) => {
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discountType: coupon?.discountType || 'percentage',
    discountValue: coupon?.discountValue || 0,
    maxUses: coupon?.maxUses || '',
    expiresAt: coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
    isActive: coupon?.isActive ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Coupon Code</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="SAVE20"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="20% off all plans"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discountType">Discount Type</Label>
          <Select 
            value={formData.discountType} 
            onValueChange={(value) => setFormData({ ...formData, discountType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="discountValue">
            {formData.discountType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
          </Label>
          <Input
            id="discountValue"
            type="number"
            value={formData.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
            min="0"
            max={formData.discountType === 'percentage' ? 100 : undefined}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxUses">Max Uses (optional)</Label>
          <Input
            id="maxUses"
            type="number"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
            placeholder="Leave empty for unlimited"
            min="1"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
          <Input
            id="expiresAt"
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      
      <Button type="submit" className="w-full">
        {coupon ? 'Update Coupon' : 'Create Coupon'}
      </Button>
    </form>
  );
};

export default AdminCoupons;


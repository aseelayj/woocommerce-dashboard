import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  Users,
  Package,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { Shop, Order } from '@/types';
import { WooCommerceAPI } from '@/lib/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardProps {
  activeShop: Shop;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  failedOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

interface RecentOrder {
  id: number;
  number: string;
  customer: string;
  total: string;
  status: string;
  date: string;
}

export function Dashboard({ activeShop }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [activeShop]);

  const loadDashboardData = async () => {
    if (!activeShop) return;

    setLoading(true);
    try {
      const api = new WooCommerceAPI(activeShop);
      
      // Get orders for current period (last 30 days)
      const currentPeriodResponse = await api.getOrders({}, { 
        page: 1, 
        limit: 100, 
        sortBy: 'date_created', 
        sortOrder: 'desc' 
      });
      
      // Get orders for previous period (30-60 days ago) for comparison
      const previousPeriodResponse = await api.getOrders({
        dateFrom: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
        dateTo: format(subDays(new Date(), 30), 'yyyy-MM-dd')
      }, { 
        page: 1, 
        limit: 100, 
        sortBy: 'date_created', 
        sortOrder: 'desc' 
      });

      const currentOrders = currentPeriodResponse.orders;
      const previousOrders = previousPeriodResponse.orders;

      // Calculate current period stats
      const totalRevenue = currentOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const totalOrders = currentOrders.length;
      const completedOrders = currentOrders.filter(order => order.status === 'completed').length;
      const pendingOrders = currentOrders.filter(order => order.status === 'pending').length;
      const processingOrders = currentOrders.filter(order => order.status === 'processing').length;
      const failedOrders = currentOrders.filter(order => order.status === 'failed').length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate previous period stats for growth comparison
      const previousRevenue = previousOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const previousOrderCount = previousOrders.length;

      // Calculate growth percentages
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100 : 0;

      setStats({
        totalRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        processingOrders,
        failedOrders,
        averageOrderValue,
        revenueGrowth,
        ordersGrowth
      });

      // Set recent orders (last 5)
      setRecentOrders(
        currentOrders.slice(0, 5).map(order => ({
          id: order.id,
          number: order.number,
          customer: `${order.customer.first_name} ${order.customer.last_name}`,
          total: order.total,
          status: order.status,
          date: order.date_created
        }))
      );

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-sm md:text-base text-gray-600">Welcome back! Here's what's happening with your store.</p>
          </div>
          <Button variant="outline" disabled className="gap-2 w-full md:w-auto">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm md:text-base text-gray-600">Welcome back! Here's what's happening with {activeShop.name}.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadDashboardData} 
          className="gap-2 border-gray-200 hover:bg-gray-50 w-full md:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Revenue */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Revenue</CardTitle>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stats && stats.revenueGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${stats && stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats ? `${Math.abs(stats.revenueGrowth).toFixed(1)}%` : '0%'} from last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Orders</CardTitle>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats?.totalOrders.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stats && stats.ordersGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${stats && stats.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats ? `${Math.abs(stats.ordersGrowth).toFixed(1)}%` : '0%'} from last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Avg. Order Value</CardTitle>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Per order average
            </p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Pending Orders</CardTitle>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats?.pendingOrders || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Order Status Breakdown */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-bold text-gray-900">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.completedOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-600">Processing</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.processingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.pendingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.failedOrders || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-bold text-gray-900">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="font-semibold text-gray-900">#{order.number}</span>
                        <Badge className={`text-xs w-fit ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{order.customer}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-gray-900">{formatCurrency(parseFloat(order.total))}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 md:py-8">
                  <Package className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No recent orders found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base md:text-lg font-bold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 border-gray-200 hover:bg-gray-50">
              <div className="text-center">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-gray-900 text-sm md:text-base">View All Orders</p>
                <p className="text-xs text-gray-500">Manage your orders</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 border-gray-200 hover:bg-gray-50">
              <div className="text-center">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 text-orange-600" />
                <p className="font-medium text-gray-900 text-sm md:text-base">Pending Orders</p>
                <p className="text-xs text-gray-500">Review pending orders</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 border-gray-200 hover:bg-gray-50 sm:col-span-2 lg:col-span-1">
              <div className="text-center">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-gray-900 text-sm md:text-base">Reports</p>
                <p className="text-xs text-gray-500">View detailed reports</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
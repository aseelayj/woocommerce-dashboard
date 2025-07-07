import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  Package,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download
} from 'lucide-react';
import { Shop } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { format, subDays } from 'date-fns';
import { apiCache } from '@/lib/cache';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { downloadInvoicePDF } from '@/components/orders/InvoiceWorking';
import { toast } from 'sonner';
import { getStoreCurrency } from '@/lib/currency';
import { getTranslatedStatus } from '@/lib/translations';

interface DashboardProps {
  activeShop: Shop | null;
  onViewChange?: (view: 'dashboard' | 'orders' | 'settings', options?: { filters?: any }) => void;
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
  isPartialData?: boolean;
}

interface RecentOrder {
  id: number;
  number: string;
  customer: string;
  total: string;
  status: string;
  date: string;
}

export function Dashboard({ activeShop, onViewChange }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [fetchAllOrders, setFetchAllOrders] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1), // January 1st of current year
      to: now
    };
  });

  useEffect(() => {
    loadDashboardData();
  }, [activeShop, dateRange]);

  const handleFetchAllOrders = () => {
    setFetchAllOrders(true);
    loadDashboardData(true);
  };

  const loadDashboardData = async (forceLoadAll = false) => {
    if (!activeShop) return;

    // Create cache key based on shop and date range
    const cacheKey = `dashboard:${activeShop.id}:${dateRange?.from?.toISOString() || 'all'}:${dateRange?.to?.toISOString() || 'all'}`;
    
    // Check if we have cached dashboard stats
    if (!forceLoadAll) {
      const cachedStats = apiCache.get<DashboardStats>(cacheKey);
      if (cachedStats) {
        setStats(cachedStats);
        setIsFromCache(true);
        setLoading(false);
        
        // Still fetch recent orders for display
        const api = new WooCommerceAPI(isUsingRealAPI() ? activeShop.id : activeShop);
        const dateFilters: any = {};
        if (dateRange?.from) dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
        if (dateRange?.to) dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
        
        const ordersResp = await api.getOrders(dateFilters, { 
          page: 1, 
          limit: 5,
          sortBy: 'date_created',
          sortOrder: 'desc'
        });
        setRecentOrders(
          ordersResp.orders.map(order => ({
            id: order.id,
            number: order.number,
            customer: `${order.customer.first_name} ${order.customer.last_name}`,
            total: order.total,
            status: order.status,
            date: order.date_created
          }))
        );
        return;
      }
    }
    
    
    setIsFromCache(false);
    setLoading(true);
    try {
      const api = new WooCommerceAPI(isUsingRealAPI() ? activeShop.id : activeShop);
      
      // Get sales report for totals based on selected date range
      let totalRevenue = 0;
      let totalOrdersCount = 0;
      
      // Prepare date filters
      const dateFilters: any = {};
      if (dateRange?.from) {
        dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }
      
      try {
        // Try to get sales report for accurate totals
        const salesReport = await api.getSalesReport({
          date_min: dateFilters.dateFrom,
          date_max: dateFilters.dateTo
        });
        
        if (salesReport && salesReport.total_sales) {
          totalRevenue = parseFloat(salesReport.total_sales);
          totalOrdersCount = parseInt(salesReport.total_orders) || 0;
        }
      } catch (error) {
        console.log('Sales report not available, will calculate from orders');
      }
      
      // Get orders for display and additional stats
      const currentPeriodResponse = await api.getOrders(dateFilters, { 
        page: 1, 
        limit: 100, 
        sortBy: 'date_created', 
        sortOrder: 'desc' 
      });
      
      // Get orders for previous period for comparison
      let previousOrders: any[] = [];
      if (dateRange?.from && dateRange?.to) {
        try {
          // Calculate previous period of same length
          const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
          const previousFrom = format(subDays(dateRange.from, periodLength), 'yyyy-MM-dd');
          const previousTo = format(subDays(dateRange.from, 1), 'yyyy-MM-dd');
          
          const previousPeriodResponse = await api.getOrders({
            dateFrom: previousFrom,
            dateTo: previousTo
          }, { 
            page: 1, 
            limit: 100, 
            sortBy: 'date_created', 
            sortOrder: 'desc' 
          });
          previousOrders = previousPeriodResponse.orders;
        } catch (error) {
          console.warn('Failed to fetch previous period data, continuing without comparison:', error);
          // Continue without comparison data
        }
      }

      const currentOrders = currentPeriodResponse.orders;

      // If we couldn't get totals from sales report, calculate from what we have
      if (totalRevenue === 0 && totalOrdersCount === 0) {
        // Use the total count from the response headers
        totalOrdersCount = currentPeriodResponse.total;
        totalRevenue = currentOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
        
        // Check if user wants to fetch all orders
        if ((fetchAllOrders || forceLoadAll) && currentPeriodResponse.total > 100) {
          console.log(`Fetching all ${currentPeriodResponse.total} orders...`);
          
          // Calculate how many pages we need to fetch
          const totalPages = currentPeriodResponse.totalPages;
          
          // Fetch remaining pages (starting from page 2)
          for (let page = 2; page <= totalPages; page++) {
            try {
              setLoadingMessage(`Fetching orders: page ${page} of ${totalPages}...`);
              console.log(`Fetching page ${page} of ${totalPages}...`);
              const pageResponse = await api.getOrders(dateFilters, { 
                page, 
                limit: 100, 
                sortBy: 'date_created', 
                sortOrder: 'desc' 
              });
              
              // Add revenue from this page
              const pageRevenue = pageResponse.orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
              totalRevenue += pageRevenue;
              
              // Optional: Add a small delay to avoid rate limiting
              if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (error) {
              console.error(`Failed to fetch page ${page}:`, error);
              // Continue with partial data if a page fails
              break;
            }
          }
          
          console.log(`Total revenue from all orders: ${formatCurrency(totalRevenue)}`);
        }
      }

      // Fetch order counts by status
      let completedOrders = 0;
      let pendingOrders = 0;
      let processingOrders = 0;
      let failedOrders = 0;
      
      // Fetch counts for each status with caching
      const statusCacheKeys = {
        completed: `status:${activeShop.id}:completed:${dateFilters.dateFrom || 'all'}:${dateFilters.dateTo || 'all'}`,
        pending: `status:${activeShop.id}:pending:${dateFilters.dateFrom || 'all'}:${dateFilters.dateTo || 'all'}`,
        processing: `status:${activeShop.id}:processing:${dateFilters.dateFrom || 'all'}:${dateFilters.dateTo || 'all'}`,
        failed: `status:${activeShop.id}:failed:${dateFilters.dateFrom || 'all'}:${dateFilters.dateTo || 'all'}`
      };
      
      // Check cache first
      const cachedCounts = apiCache.getMultiple<number>([
        statusCacheKeys.completed,
        statusCacheKeys.pending,
        statusCacheKeys.processing,
        statusCacheKeys.failed
      ]);
      
      if (cachedCounts.every(count => count !== null)) {
        [completedOrders, pendingOrders, processingOrders, failedOrders] = cachedCounts as number[];
      } else {
        try {
          const [completedResp, pendingResp, processingResp, failedResp] = await Promise.all([
            api.getOrders({ ...dateFilters, status: 'completed' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
            api.getOrders({ ...dateFilters, status: 'pending' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
            api.getOrders({ ...dateFilters, status: 'processing' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
            api.getOrders({ ...dateFilters, status: 'failed' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' })
          ]);
          
          completedOrders = completedResp.total;
          pendingOrders = pendingResp.total;
          processingOrders = processingResp.total;
          failedOrders = failedResp.total;
          
          // Cache the counts for 3 minutes
          apiCache.setMultiple([
            { key: statusCacheKeys.completed, data: completedOrders, ttl: 3 * 60 * 1000 },
            { key: statusCacheKeys.pending, data: pendingOrders, ttl: 3 * 60 * 1000 },
            { key: statusCacheKeys.processing, data: processingOrders, ttl: 3 * 60 * 1000 },
            { key: statusCacheKeys.failed, data: failedOrders, ttl: 3 * 60 * 1000 }
          ]);
        } catch (error) {
          console.error('Failed to fetch order status counts:', error);
          // Fallback to counting from current orders
          completedOrders = currentOrders.filter(order => order.status === 'completed').length;
          pendingOrders = currentOrders.filter(order => order.status === 'pending').length;
          processingOrders = currentOrders.filter(order => order.status === 'processing').length;
          failedOrders = currentOrders.filter(order => order.status === 'failed').length;
        }
      }
      
      const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

      // Calculate previous period stats for growth comparison
      const previousRevenue = previousOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const previousOrderCount = previousOrders.length;

      // Calculate growth percentages
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((totalOrdersCount - previousOrderCount) / previousOrderCount) * 100 : 0;

      const statsData = {
        totalRevenue,
        totalOrders: totalOrdersCount,
        completedOrders,
        pendingOrders,
        processingOrders,
        failedOrders,
        averageOrderValue,
        revenueGrowth,
        ordersGrowth,
        isPartialData: currentPeriodResponse.total > 100 && !fetchAllOrders
      };
      
      setStats(statsData);
      
      // Cache the dashboard stats for 5 minutes
      apiCache.set(cacheKey, statsData, 5 * 60 * 1000);

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
      setLoadingMessage('');
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = getStoreCurrency(activeShop);
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleDownloadInvoice = async (orderId: number) => {
    if (!activeShop) return;

    try {
      toast.info('Generating invoice...');
      const api = new WooCommerceAPI(isUsingRealAPI() ? activeShop.id : activeShop);
      const order = await api.getOrder(orderId);
      
      if (order) {
        await downloadInvoicePDF(order, activeShop);
        toast.success('Invoice downloaded successfully');
      } else {
        toast.error('Order not found');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
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
            {loadingMessage || 'Loading...'}
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-sm md:text-base text-gray-600">Welcome back! Here's what's happening with {activeShop?.name || 'your store'}.</p>
          </div>
          <div className="flex items-center gap-2">
            {isFromCache && !loading && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Cached data
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                apiCache.clear(); // Clear all cache
                loadDashboardData();
              }} 
              className="gap-2 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
        
        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <DateRangePicker
            value={dateRange}
            onValueChange={setDateRange}
            className="w-full sm:w-auto"
          />
          {dateRange && (
            <div className="text-sm text-gray-600">
              Showing data from {format(dateRange.from!, 'MMM dd, yyyy')} to {format(dateRange.to!, 'MMM dd, yyyy')}
            </div>
          )}
        </div>
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
              {stats?.isPartialData && (
                <div className="mt-1">
                  <span className="text-xs text-amber-600 font-normal block">
                    (from first 100 of {stats.totalOrders} orders)
                  </span>
                  <Button 
                    size="sm" 
                    variant="link" 
                    className="text-xs p-0 h-auto text-blue-600 hover:text-blue-700"
                    onClick={handleFetchAllOrders}
                    disabled={loading}
                  >
                    Load all orders
                  </Button>
                </div>
              )}
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
                <span className="text-sm text-gray-600">{getTranslatedStatus('completed')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.completedOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-600">{getTranslatedStatus('processing')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.processingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-600">{getTranslatedStatus('pending')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.pendingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">{getTranslatedStatus('failed')}</span>
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
                          {getTranslatedStatus(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{order.customer}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(parseFloat(order.total))}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadInvoice(order.id)}
                        className="h-8 w-8 p-0"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
            <Button 
              variant="outline" 
              className="h-auto p-4 border-gray-200 hover:bg-gray-50"
              onClick={() => onViewChange?.('orders')}
            >
              <div className="text-center">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-gray-900 text-sm md:text-base">View All Orders</p>
                <p className="text-xs text-gray-500">Manage your orders</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 border-gray-200 hover:bg-gray-50"
              onClick={() => {
                onViewChange?.('orders', { filters: { status: 'pending' } });
              }}
            >
              <div className="text-center">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 text-orange-600" />
                <p className="font-medium text-gray-900 text-sm md:text-base">Pending Orders</p>
                <p className="text-xs text-gray-500">Review pending orders</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 border-gray-200 hover:bg-gray-50 sm:col-span-2 lg:col-span-1"
              onClick={() => onViewChange?.('orders')}
            >
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
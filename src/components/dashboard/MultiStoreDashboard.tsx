import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  RefreshCw,
  Store
} from 'lucide-react';
import { Shop } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { format } from 'date-fns';
import { apiCache } from '@/lib/cache';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface MultiStoreDashboardProps {
  shops: Shop[];
}

interface StoreStats {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  failedOrders: number;
  averageOrderValue: number;
}

interface AggregatedStats {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  failedOrders: number;
  averageOrderValue: number;
  storeStats: StoreStats[];
}

export function MultiStoreDashboard({ shops }: MultiStoreDashboardProps) {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStores, setLoadingStores] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1), // January 1st of current year
      to: now
    };
  });

  useEffect(() => {
    loadAllStoresData();
  }, [shops, dateRange]);

  const loadAllStoresData = async () => {
    if (!shops.length) return;

    setLoading(true);
    setLoadingStores([]);

    try {
      // Prepare date filters
      const dateFilters: any = {};
      if (dateRange?.from) {
        dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }

      // Fetch data for all stores in parallel
      const storePromises = shops
        .filter(shop => shop.isActive)
        .map(async (shop) => {
          setLoadingStores(prev => [...prev, shop.name]);
          
          try {
            const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
            
            // Get orders for this store
            const ordersResponse = await api.getOrders(dateFilters, {
              page: 1,
              limit: 100,
              sortBy: 'date_created',
              sortOrder: 'desc'
            });

            // Get status counts
            const [completedResp, pendingResp, processingResp, failedResp] = await Promise.all([
              api.getOrders({ ...dateFilters, status: 'completed' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
              api.getOrders({ ...dateFilters, status: 'pending' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
              api.getOrders({ ...dateFilters, status: 'processing' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
              api.getOrders({ ...dateFilters, status: 'failed' }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' })
            ]);

            const totalRevenue = ordersResponse.orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
            const totalOrders = ordersResponse.total;

            return {
              storeId: shop.id,
              storeName: shop.name,
              totalRevenue,
              totalOrders,
              completedOrders: completedResp.total,
              pendingOrders: pendingResp.total,
              processingOrders: processingResp.total,
              failedOrders: failedResp.total,
              averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
            } as StoreStats;
          } catch (error) {
            console.error(`Error loading data for ${shop.name}:`, error);
            return {
              storeId: shop.id,
              storeName: shop.name,
              totalRevenue: 0,
              totalOrders: 0,
              completedOrders: 0,
              pendingOrders: 0,
              processingOrders: 0,
              failedOrders: 0,
              averageOrderValue: 0
            } as StoreStats;
          } finally {
            setLoadingStores(prev => prev.filter(name => name !== shop.name));
          }
        });

      const storeStats = await Promise.all(storePromises);

      // Calculate aggregated stats
      const aggregated: AggregatedStats = {
        totalRevenue: storeStats.reduce((sum, store) => sum + store.totalRevenue, 0),
        totalOrders: storeStats.reduce((sum, store) => sum + store.totalOrders, 0),
        completedOrders: storeStats.reduce((sum, store) => sum + store.completedOrders, 0),
        pendingOrders: storeStats.reduce((sum, store) => sum + store.pendingOrders, 0),
        processingOrders: storeStats.reduce((sum, store) => sum + store.processingOrders, 0),
        failedOrders: storeStats.reduce((sum, store) => sum + store.failedOrders, 0),
        averageOrderValue: 0,
        storeStats
      };

      // Calculate overall average order value
      aggregated.averageOrderValue = aggregated.totalOrders > 0 
        ? aggregated.totalRevenue / aggregated.totalOrders 
        : 0;

      setStats(aggregated);
    } catch (error) {
      console.error('Error loading multi-store data:', error);
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


  if (loading && loadingStores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Loading data from all stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Stores Overview</h2>
            <p className="text-gray-600">Aggregated data from {shops.filter(s => s.isActive).length} active stores</p>
          </div>
          <div className="flex items-center gap-2">
            {loadingStores.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Loading: {loadingStores.join(', ')}
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                apiCache.clear();
                loadAllStoresData();
              }}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
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

      {/* Aggregated Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Across all stores
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalOrders.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Combined orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Across all stores
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.pendingOrders || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Summary */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Order Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats?.completedOrders || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.processingOrders || 0}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats?.pendingOrders || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.failedOrders || 0}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Store Performance */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Store Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.storeStats.map((store) => (
              <div key={store.storeId} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-600" />
                    <h4 className="font-semibold text-gray-900">{store.storeName}</h4>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {store.totalOrders} orders
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Revenue:</span>
                    <p className="font-semibold text-gray-900">{formatCurrency(store.totalRevenue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg. Order:</span>
                    <p className="font-semibold text-gray-900">{formatCurrency(store.averageOrderValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <p className="font-semibold text-green-600">{store.completedOrders}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Pending:</span>
                    <p className="font-semibold text-amber-600">{store.pendingOrders}</p>
                  </div>
                </div>

                {/* Progress bar showing revenue contribution */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Revenue contribution</span>
                    <span>{((store.totalRevenue / (stats?.totalRevenue || 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(store.totalRevenue / (stats?.totalRevenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
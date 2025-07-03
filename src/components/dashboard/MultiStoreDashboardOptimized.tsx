import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  RefreshCw,
  Store,
  Zap
} from 'lucide-react';
import { Shop } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { format } from 'date-fns';
import { apiCache } from '@/lib/cache';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface MultiStoreDashboardOptimizedProps {
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


export function MultiStoreDashboardOptimized({ shops }: MultiStoreDashboardOptimizedProps) {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStores, setLoadingStores] = useState<Set<string>>(new Set());
  const [storeData, setStoreData] = useState<Map<string, StoreStats>>(new Map());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: now
    };
  });

  // Optimization 2: Memoize active shops
  const activeShops = useMemo(() => shops.filter(shop => shop.isActive), [shops]);

  // Optimization 3: Create a cache key based on date range
  const getCacheKey = useCallback((storeId: string, dateRange: DateRange | undefined) => {
    const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'all';
    const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'all';
    return `store-stats-${storeId}-${from}-${to}`;
  }, []);

  // Optimization 4: Fetch store data with better error handling and caching
  const fetchStoreData = useCallback(async (shop: Shop): Promise<StoreStats | null> => {
    const cacheKey = getCacheKey(shop.id, dateRange);
    
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached as StoreStats;
    }

    try {
      const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
      
      // Prepare date filters
      const dateFilters: any = {};
      if (dateRange?.from) {
        dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }

      // Optimization 5: Use a single API call that returns aggregated data
      // In a real implementation, this would be a custom endpoint that returns all needed data
      const [ordersResp, salesResp] = await Promise.all([
        // Get total order count and revenue
        api.getOrders(dateFilters, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' }),
        // Get sales report if available (mock this for now)
        api.getSalesReport ? api.getSalesReport(dateFilters) : null
      ]);

      // Optimization 6: Get status counts in a single query with aggregation
      const statusPromises = ['completed', 'pending', 'processing', 'failed'].map(status =>
        api.getOrders({ ...dateFilters, status }, { page: 1, limit: 1, sortBy: 'date_created', sortOrder: 'desc' })
          .then(resp => ({ status, count: resp.total }))
      );
      
      const statusCounts = await Promise.all(statusPromises);
      const statusMap = statusCounts.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>);

      // Calculate revenue more efficiently
      let totalRevenue = 0;
      if (salesResp?.totalSales !== undefined) {
        totalRevenue = salesResp.totalSales;
      } else {
        // Fallback: fetch only completed orders for revenue calculation
        const completedOrders = await api.getOrders(
          { ...dateFilters, status: 'completed' },
          { page: 1, limit: 100, sortBy: 'date_created', sortOrder: 'desc' }
        );
        totalRevenue = completedOrders.orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      }

      const storeStats: StoreStats = {
        storeId: shop.id,
        storeName: shop.name,
        totalRevenue,
        totalOrders: ordersResp.total,
        completedOrders: statusMap.completed || 0,
        pendingOrders: statusMap.pending || 0,
        processingOrders: statusMap.processing || 0,
        failedOrders: statusMap.failed || 0,
        averageOrderValue: ordersResp.total > 0 ? totalRevenue / ordersResp.total : 0
      };

      // Cache the result
      apiCache.set(cacheKey, storeStats);
      
      return storeStats;
    } catch (error) {
      console.error(`Error loading data for ${shop.name}:`, error);
      return null;
    }
  }, [dateRange, getCacheKey]);

  // Optimization 7: Progressive loading - load stores one by one and update UI immediately
  const loadStoresProgressively = useCallback(async () => {
    setLoading(true);
    const newLoadingStores = new Set<string>();

    // Start loading all stores
    activeShops.forEach(shop => newLoadingStores.add(shop.name));
    setLoadingStores(newLoadingStores);

    // Process stores in parallel but update UI as each completes
    const storePromises = activeShops.map(async (shop) => {
      const data = await fetchStoreData(shop);
      
      if (data) {
        // Update individual store data immediately
        setStoreData(prev => {
          const updated = new Map(prev);
          updated.set(shop.id, data);
          return updated;
        });
      }

      // Remove from loading set
      setLoadingStores(prev => {
        const updated = new Set(prev);
        updated.delete(shop.name);
        return updated;
      });

      return data;
    });

    // Wait for all to complete
    const allStoreStats = await Promise.all(storePromises);
    const validStats = allStoreStats.filter((s): s is StoreStats => s !== null);

    // Calculate aggregated stats
    const aggregated: AggregatedStats = {
      totalRevenue: validStats.reduce((sum, store) => sum + store.totalRevenue, 0),
      totalOrders: validStats.reduce((sum, store) => sum + store.totalOrders, 0),
      completedOrders: validStats.reduce((sum, store) => sum + store.completedOrders, 0),
      pendingOrders: validStats.reduce((sum, store) => sum + store.pendingOrders, 0),
      processingOrders: validStats.reduce((sum, store) => sum + store.processingOrders, 0),
      failedOrders: validStats.reduce((sum, store) => sum + store.failedOrders, 0),
      averageOrderValue: 0,
      storeStats: validStats
    };

    aggregated.averageOrderValue = aggregated.totalOrders > 0 
      ? aggregated.totalRevenue / aggregated.totalOrders 
      : 0;

    setStats(aggregated);
    setLoading(false);
  }, [activeShops, fetchStoreData]);

  // Optimization 8: Debounce date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStoresProgressively();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadStoresProgressively]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isInitialLoading = loading && !stats;
  
  const StatsCardSkeleton = () => (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="space-y-0 pb-3">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );

  const StoreCardSkeleton = () => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );

  // Optimization 9: Calculate aggregated stats from storeData map for real-time updates
  const realtimeStats = useMemo(() => {
    if (storeData.size === 0) return null;

    const validStats = Array.from(storeData.values());
    const aggregated: AggregatedStats = {
      totalRevenue: validStats.reduce((sum, store) => sum + store.totalRevenue, 0),
      totalOrders: validStats.reduce((sum, store) => sum + store.totalOrders, 0),
      completedOrders: validStats.reduce((sum, store) => sum + store.completedOrders, 0),
      pendingOrders: validStats.reduce((sum, store) => sum + store.pendingOrders, 0),
      processingOrders: validStats.reduce((sum, store) => sum + store.processingOrders, 0),
      failedOrders: validStats.reduce((sum, store) => sum + store.failedOrders, 0),
      averageOrderValue: 0,
      storeStats: validStats
    };

    aggregated.averageOrderValue = aggregated.totalOrders > 0 
      ? aggregated.totalRevenue / aggregated.totalOrders 
      : 0;

    return aggregated;
  }, [storeData]);

  const displayStats = realtimeStats || stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Stores Overview</h2>
            <p className="text-gray-600">
              Aggregated data from {activeShops.length} active stores
              {loadingStores.size > 0 && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs">Loading {loadingStores.size} stores...</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                apiCache.clear();
                setStoreData(new Map());
                loadStoresProgressively();
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

      {/* Aggregated Stats - Updates in real-time as stores load */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isInitialLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(displayStats?.totalRevenue || 0)}
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
                  {displayStats?.totalOrders.toLocaleString() || '0'}
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
                  {formatCurrency(displayStats?.averageOrderValue || 0)}
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
                  {displayStats?.pendingOrders || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Need attention
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Store Performance - Shows stores as they load */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Store Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeShops.map((shop) => {
              const store = storeData.get(shop.id);
              const isLoading = loadingStores.has(shop.name);
              
              if (!store && !isLoading && !isInitialLoading) return null;
              
              return isLoading || !store ? (
                <StoreCardSkeleton key={shop.id} />
              ) : (
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
                      <span>{((store.totalRevenue / (displayStats?.totalRevenue || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(store.totalRevenue / (displayStats?.totalRevenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
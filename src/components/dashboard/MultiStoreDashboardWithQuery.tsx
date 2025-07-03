import { useState } from 'react';
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
  Zap,
  AlertCircle
} from 'lucide-react';
import { Shop } from '@/types';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useMultiStoreStats, useInvalidateStoreStats } from '@/hooks/useStoreStats';

interface MultiStoreDashboardWithQueryProps {
  shops: Shop[];
}

export function MultiStoreDashboardWithQuery({ shops }: MultiStoreDashboardWithQueryProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: now
    };
  });

  const { invalidateAll } = useInvalidateStoreStats();
  
  // Use React Query hook
  const { data: stats, storeQueries, isLoading, isFetching, refetchAll } = useMultiStoreStats(shops, dateRange);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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

  // Count loading stores
  const loadingStoresCount = storeQueries.filter(q => q.isLoading).length;
  const fetchingStoresCount = storeQueries.filter(q => q.isFetching && !q.isLoading).length;

  const handleRefresh = () => {
    invalidateAll();
    refetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Stores Overview</h2>
            <p className="text-gray-600">
              Aggregated data from {shops.filter(s => s.isActive).length} active stores
              {(loadingStoresCount > 0 || fetchingStoresCount > 0) && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs">
                    {loadingStoresCount > 0 
                      ? `Loading ${loadingStoresCount} stores...` 
                      : `Updating ${fetchingStoresCount} stores...`}
                  </span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating
              </Badge>
            )}
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
        {isLoading && stats.storeStats.length === 0 ? (
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
                  {formatCurrency(stats.totalRevenue)}
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
                  {stats.totalOrders.toLocaleString()}
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
                  {formatCurrency(stats.averageOrderValue)}
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
                  {stats.pendingOrders}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Need attention
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Order Status Summary */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Order Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {stats.completedOrders}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.processingOrders}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {stats.pendingOrders}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.failedOrders}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Performance */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Store Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shops.filter(s => s.isActive).map((shop, index) => {
              const storeQuery = storeQueries[index];
              const storeData = storeQuery?.data;
              const isStoreLoading = storeQuery?.isLoading;
              const isStoreFetching = storeQuery?.isFetching;
              const hasError = storeQuery?.isError;
              
              return isStoreLoading ? (
                <StoreCardSkeleton key={shop.id} />
              ) : storeData ? (
                <div key={shop.id} className="p-4 bg-gray-50 rounded-lg relative">
                  {isStoreFetching && (
                    <div className="absolute top-2 right-2">
                      <RefreshCw className="h-3 w-3 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {hasError && (
                    <div className="absolute top-2 right-2" title="Error loading data">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">{storeData.storeName}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {storeData.totalOrders} orders
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Revenue:</span>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(storeData.totalRevenue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg. Order:</span>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(storeData.averageOrderValue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <p className="font-semibold text-green-600">
                        {storeData.completedOrders}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Pending:</span>
                      <p className="font-semibold text-amber-600">
                        {storeData.pendingOrders}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar showing revenue contribution */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Revenue contribution</span>
                      <span>
                        {stats.totalRevenue > 0 
                          ? `${((storeData.totalRevenue / stats.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: stats.totalRevenue > 0 
                            ? `${(storeData.totalRevenue / stats.totalRevenue) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={shop.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-center text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Failed to load data for {shop.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* React Query DevTools Info */}
      <div className="text-xs text-gray-500 text-center">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded">D</kbd> to open React Query DevTools
      </div>
    </div>
  );
}
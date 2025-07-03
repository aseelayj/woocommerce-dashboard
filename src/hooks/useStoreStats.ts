import { useQuery, useQueries, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { Shop } from '@/types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

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

// Query key factory for consistent key generation
export const storeStatsKeys = {
  all: ['storeStats'] as const,
  lists: () => [...storeStatsKeys.all, 'list'] as const,
  list: (filters: { dateRange?: DateRange }) => [...storeStatsKeys.lists(), filters] as const,
  details: () => [...storeStatsKeys.all, 'detail'] as const,
  detail: (storeId: string, dateRange?: DateRange) => [...storeStatsKeys.details(), storeId, dateRange] as const,
};

// Fetch stats for a single store
async function fetchStoreStats(shop: Shop, dateRange?: DateRange): Promise<StoreStats> {
  const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
  
  // Prepare date filters
  const dateFilters: any = {};
  if (dateRange?.from) {
    dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  }
  if (dateRange?.to) {
    dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
  }

  try {
    // Parallel fetch for performance
    const [ordersResp, salesResp, statusPromises] = await Promise.all([
      // Get total order count
      api.getOrders(dateFilters, { page: 1, limit: 1 }),
      // Get sales report if available
      api.getSalesReport ? api.getSalesReport(dateFilters).catch(() => null) : Promise.resolve(null),
      // Get status counts
      Promise.all(['completed', 'pending', 'processing', 'failed'].map(status =>
        api.getOrders({ ...dateFilters, status }, { page: 1, limit: 1 })
          .then(resp => ({ status, count: resp.total }))
      ))
    ]);

    const statusMap = statusPromises.reduce((acc, { status, count }) => {
      acc[status] = count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate revenue
    let totalRevenue = 0;
    if (salesResp?.totalSales !== undefined) {
      totalRevenue = salesResp.totalSales;
    } else if (salesResp?.total_sales !== undefined) {
      totalRevenue = parseFloat(salesResp.total_sales);
    } else {
      // Fallback: fetch completed orders for revenue
      const completedOrders = await api.getOrders(
        { ...dateFilters, status: 'completed' },
        { page: 1, limit: 100 }
      );
      totalRevenue = completedOrders.orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    }

    const totalOrders = ordersResp.total;

    return {
      storeId: shop.id,
      storeName: shop.name,
      totalRevenue,
      totalOrders,
      completedOrders: statusMap.completed || 0,
      pendingOrders: statusMap.pending || 0,
      processingOrders: statusMap.processing || 0,
      failedOrders: statusMap.failed || 0,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    };
  } catch (error) {
    console.error(`Error loading data for ${shop.name}:`, error);
    // Return zeros on error to prevent UI break
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
    };
  }
}

// Hook to fetch stats for a single store
export function useStoreStats(shop: Shop | null, dateRange?: DateRange) {
  return useQuery({
    queryKey: shop ? storeStatsKeys.detail(shop.id, dateRange) : ['null'],
    queryFn: () => shop ? fetchStoreStats(shop, dateRange) : null,
    enabled: !!shop && shop.isActive,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch stats for multiple stores
export function useMultiStoreStats(shops: Shop[], dateRange?: DateRange) {
  const activeShops = shops.filter(shop => shop.isActive);
  
  // Use useQueries to fetch all stores in parallel
  const storeQueries = useQueries({
    queries: activeShops.map(shop => ({
      queryKey: storeStatsKeys.detail(shop.id, dateRange),
      queryFn: () => fetchStoreStats(shop, dateRange),
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }))
  });

  // Compute aggregated stats
  const aggregatedStats: AggregatedStats = {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    failedOrders: 0,
    averageOrderValue: 0,
    storeStats: []
  };

  // Process successful queries
  storeQueries.forEach((query) => {
    if (query.data) {
      aggregatedStats.storeStats.push(query.data);
      aggregatedStats.totalRevenue += query.data.totalRevenue;
      aggregatedStats.totalOrders += query.data.totalOrders;
      aggregatedStats.completedOrders += query.data.completedOrders;
      aggregatedStats.pendingOrders += query.data.pendingOrders;
      aggregatedStats.processingOrders += query.data.processingOrders;
      aggregatedStats.failedOrders += query.data.failedOrders;
    }
  });

  // Calculate average order value
  if (aggregatedStats.totalOrders > 0) {
    aggregatedStats.averageOrderValue = aggregatedStats.totalRevenue / aggregatedStats.totalOrders;
  }

  // Determine overall loading state
  const isLoading = storeQueries.some(q => q.isLoading);
  const isError = storeQueries.some(q => q.isError);
  const isFetching = storeQueries.some(q => q.isFetching);

  return {
    data: aggregatedStats,
    storeQueries,
    isLoading,
    isError,
    isFetching,
    refetchAll: () => storeQueries.forEach(q => q.refetch()),
  };
}

// Hook to prefetch store stats (useful for hover states or predictive loading)
export function usePrefetchStoreStats() {
  const queryClient = useQueryClient();
  
  return (shop: Shop, dateRange?: DateRange) => {
    queryClient.prefetchQuery({
      queryKey: storeStatsKeys.detail(shop.id, dateRange),
      queryFn: () => fetchStoreStats(shop, dateRange),
      staleTime: 3 * 60 * 1000,
    });
  };
}

// Hook to invalidate store stats (useful after mutations)
export function useInvalidateStoreStats() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: storeStatsKeys.all }),
    invalidateStore: (storeId: string) => 
      queryClient.invalidateQueries({ queryKey: storeStatsKeys.detail(storeId) }),
  };
}
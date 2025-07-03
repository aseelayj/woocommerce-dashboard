import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { Shop, Order, FilterOptions, PaginationOptions, OrderStatus } from '@/types';

// Query key factory
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (shopId: string, filters: FilterOptions) => [...orderKeys.lists(), shopId, filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (shopId: string, orderId: number) => [...orderKeys.details(), shopId, orderId] as const,
};

// Fetch orders with pagination
export function useOrders(
  shop: Shop | null,
  filters: FilterOptions,
  pagination: PaginationOptions,
  enabled = true
) {
  return useQuery({
    queryKey: shop ? orderKeys.list(shop.id, filters) : ['null'],
    queryFn: async () => {
      if (!shop) return null;
      const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
      return api.getOrders(filters, pagination);
    },
    enabled: !!shop && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Infinite scroll orders
export function useInfiniteOrders(
  shop: Shop | null,
  filters: FilterOptions,
  limit = 50
) {
  return useInfiniteQuery({
    queryKey: shop ? [...orderKeys.list(shop.id, filters), 'infinite'] : ['null'],
    queryFn: async ({ pageParam = 1 }) => {
      if (!shop) return null;
      const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
      return api.getOrders(filters, {
        page: pageParam,
        limit,
        sortBy: 'date_created',
        sortOrder: 'desc',
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      const loadedCount = allPages.reduce((sum, page) => sum + (page?.orders.length || 0), 0);
      return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: !!shop,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single order
export function useOrder(shop: Shop | null, orderId: number | null) {
  return useQuery({
    queryKey: shop && orderId ? orderKeys.detail(shop.id, orderId) : ['null'],
    queryFn: async () => {
      if (!shop || !orderId) return null;
      const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
      return api.getOrder(orderId);
    },
    enabled: !!shop && !!orderId,
    staleTime: 5 * 60 * 1000,
  });
}

// Update order status with optimistic update
export function useUpdateOrderStatus(shop: Shop | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      if (!shop) throw new Error('No shop selected');
      const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
      return api.updateOrderStatus(orderId, status);
    },
    onMutate: async ({ orderId, status }) => {
      if (!shop) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(shop.id, orderId) });

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData<Order>(orderKeys.detail(shop.id, orderId));

      // Optimistically update the order
      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(shop.id, orderId), {
          ...previousOrder,
          status,
        });
      }

      // Also update in lists
      queryClient.setQueriesData<{ orders: Order[]; total: number }>(
        { queryKey: orderKeys.lists(), exact: false },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map(order =>
              order.id === orderId ? { ...order, status } : order
            ),
          };
        }
      );

      return { previousOrder };
    },
    onError: (_, { orderId }, context) => {
      if (!shop || !context) return;
      
      // Revert the optimistic update
      if (context.previousOrder) {
        queryClient.setQueryData<Order>(
          orderKeys.detail(shop.id, orderId),
          context.previousOrder
        );
      }
      
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: orderKeys.list(shop.id, {}) });
    },
    onSettled: (_, __, { orderId }) => {
      if (!shop) return;
      
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(shop.id, orderId) });
      
      // Invalidate store stats as order status affects stats
      queryClient.invalidateQueries({ queryKey: ['storeStats', 'detail', shop.id] });
    },
  });
}

// Prefetch orders
export function usePrefetchOrders() {
  const queryClient = useQueryClient();
  
  return (shop: Shop, filters: FilterOptions, pagination: PaginationOptions) => {
    queryClient.prefetchQuery({
      queryKey: orderKeys.list(shop.id, filters),
      queryFn: async () => {
        const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
        return api.getOrders(filters, pagination);
      },
      staleTime: 2 * 60 * 1000,
    });
  };
}

// Invalidate orders
export function useInvalidateOrders() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
    invalidateShop: (shopId: string) => 
      queryClient.invalidateQueries({ queryKey: orderKeys.list(shopId, {}) }),
    invalidateOrder: (shopId: string, orderId: number) =>
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, orderId) }),
  };
}
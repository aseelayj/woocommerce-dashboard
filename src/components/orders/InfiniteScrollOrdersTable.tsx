import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Order } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollOrdersTableProps {
  orders: (Order & { shopName?: string; shopId?: string })[];
  onOrderSelect: (order: Order & { shopName?: string; shopId?: string }) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
  showStoreColumn?: boolean;
}

export function InfiniteScrollOrdersTable({
  orders,
  onOrderSelect,
  loadMore,
  hasMore,
  loading,
  showStoreColumn = false,
}: InfiniteScrollOrdersTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: orders.length + (hasMore ? 1 : 0), // Add 1 for loading row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Handle infinite scroll
  const lastItem = rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1];
  
  useEffect(() => {
    if (!lastItem || !hasMore || isLoadingMore || loading) {
      return;
    }

    // If we're near the last item, load more
    if (lastItem.index >= orders.length - 5) {
      setIsLoadingMore(true);
      loadMore().finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [lastItem, orders.length, hasMore, isLoadingMore, loading, loadMore]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'on-hold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="rounded-lg border overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-4 font-medium text-gray-900">Order</th>
              <th className="text-left p-4 font-medium text-gray-900">Date</th>
              <th className="text-left p-4 font-medium text-gray-900">Customer</th>
              {showStoreColumn && (
                <th className="text-left p-4 font-medium text-gray-900">Store</th>
              )}
              <th className="text-left p-4 font-medium text-gray-900">Status</th>
              <th className="text-right p-4 font-medium text-gray-900">Total</th>
            </tr>
          </thead>
        </table>
        
        <div
          ref={parentRef}
          className="h-[600px] overflow-y-auto"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              // Loading row
              if (virtualItem.index >= orders.length) {
                return (
                  <div
                    key="loading"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="flex items-center justify-center p-4 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading more orders...
                    </div>
                  </div>
                );
              }

              const order = orders[virtualItem.index];

              return (
                <div
                  key={order.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <table className="w-full">
                    <tbody>
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onOrderSelect(order)}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900">#{order.number}</div>
                          <div className="text-sm text-gray-500">{order.line_items.length} items</div>
                        </td>
                        <td className="p-4 text-gray-900">
                          {format(new Date(order.date_created), 'MMM dd, yyyy')}
                          <div className="text-sm text-gray-500">
                            {format(new Date(order.date_created), 'HH:mm')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {order.customer.first_name} {order.customer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        </td>
                        {showStoreColumn && (
                          <td className="p-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.shopName || 'Unknown'}
                            </div>
                          </td>
                        )}
                        <td className="p-4">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
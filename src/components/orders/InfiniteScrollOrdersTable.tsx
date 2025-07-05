import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Order, Shop } from '@/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, Store } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatStoreCurrency } from '@/lib/currency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStoreLogoUrl, getStoreLogoByName } from '@/config/store-logos';

interface InfiniteScrollOrdersTableProps {
  orders: (Order & { shopName?: string; shopId?: string })[];
  onOrderSelect: (order: Order & { shopName?: string; shopId?: string }) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
  showStoreColumn?: boolean;
  shop?: Shop | null;
  shops?: Shop[];
  onDownloadInvoice?: (order: Order & { shopName?: string; shopId?: string }) => void;
}

export function InfiniteScrollOrdersTable({
  orders,
  onOrderSelect,
  loadMore,
  hasMore,
  loading,
  showStoreColumn = false,
  shop,
  shops,
  onDownloadInvoice,
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


  const formatCurrency = (amount: string, order?: Order & { shopName?: string; shopId?: string }) => {
    // If we have shops array and the order has a shopId, find the correct shop
    if (shops && order?.shopId) {
      const orderShop = shops.find(s => s.id === order.shopId);
      if (orderShop) {
        return formatStoreCurrency(amount, orderShop);
      }
    }
    // Fallback to the provided shop or default formatting
    return formatStoreCurrency(amount, shop);
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {showStoreColumn && (
                <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-64">Store</th>
              )}
              <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-32">Order</th>
              <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-36">Date</th>
              <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-48">Customer</th>
              <th className="text-left px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-36">Status</th>
              <th className="text-right px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-32">Total</th>
              <th className="text-center px-6 py-4 font-medium text-gray-700 text-xs uppercase tracking-wider w-20">Actions</th>
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
                  <table className="w-full table-fixed">
                    <tbody>
                      <tr
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        {showStoreColumn && (
                          <td className="px-6 py-4 w-64">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {(() => {
                                  // First try to find shop by ID
                                  let shop = shops?.find(s => s.id === order.shopId);
                                  
                                  // If not found by ID, try to match by shop name or store URL
                                  if (!shop && shops && order.shopName) {
                                    shop = shops.find(s => 
                                      s.name.toLowerCase() === order.shopName!.toLowerCase() ||
                                      s.name.toLowerCase().includes(order.shopName!.toLowerCase()) ||
                                      order.shopName!.toLowerCase().includes(s.name.toLowerCase())
                                    );
                                  }
                                  
                                  // Get logo URL either from shop or from hardcoded mappings
                                  let logoUrl = shop?.logoUrl;
                                  
                                  // If no logo from shop, try to get from hardcoded mappings based on shop's base URL
                                  if (!logoUrl && shop?.baseUrl) {
                                    logoUrl = getStoreLogoUrl(shop.baseUrl) || undefined;
                                  }
                                  
                                  // If still no logo, try to determine from order's shop name
                                  if (!logoUrl && order.shopName) {
                                    logoUrl = getStoreLogoByName(order.shopName) || undefined;
                                  }
                                  
                                  
                                  return logoUrl ? (
                                    <AvatarImage 
                                      src={logoUrl} 
                                      alt={order.shopName || 'Store logo'}
                                      className="object-contain"
                                    />
                                  ) : null;
                                })()}
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                                  {order.shopName ? order.shopName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : <Store className="h-4 w-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-xs font-medium text-gray-700">
                                {order.shopName || 'Unknown'}
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 w-32 cursor-pointer" onClick={() => onOrderSelect(order)}>
                          <div className="font-medium text-gray-900">#{order.number}</div>
                          <div className="text-xs text-gray-500">{order.line_items.length} items</div>
                        </td>
                        <td className="px-6 py-4 w-36 cursor-pointer" onClick={() => onOrderSelect(order)}>
                          <div className="text-sm text-gray-900">{format(new Date(order.date_created), 'MMM dd, yyyy')}</div>
                          <div className="text-xs text-gray-500">{format(new Date(order.date_created), 'HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4 w-48">
                          <div className="font-medium text-gray-900 cursor-pointer truncate pr-2" onClick={() => onOrderSelect(order)}>
                            {order.customer.first_name} {order.customer.last_name}
                          </div>
                          <div className="text-xs text-gray-500 hover:text-gray-700 cursor-text select-text truncate pr-2" onClick={(e) => e.stopPropagation()}>
                            {order.customer.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 w-36 cursor-pointer" onClick={() => onOrderSelect(order)}>
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 w-32 text-right cursor-pointer" onClick={() => onOrderSelect(order)}>
                          <div className="font-semibold text-gray-900">{formatCurrency(order.total, order)}</div>
                        </td>
                        <td className="px-6 py-4 w-20 text-center">
                          {onDownloadInvoice && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadInvoice(order);
                              }}
                              className="h-8 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium"
                              title="Download Invoice"
                            >
                              PDF
                            </Button>
                          )}
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
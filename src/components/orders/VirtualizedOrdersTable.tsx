import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Order } from '@/types';
import { format } from 'date-fns';
import { Store } from 'lucide-react';

interface VirtualizedOrdersTableProps {
  orders: (Order & { shopName?: string; shopId?: string })[];
  onOrderSelect: (order: Order & { shopName?: string; shopId?: string }) => void;
  showStoreColumn?: boolean;
}

export function VirtualizedOrdersTable({ 
  orders, 
  onOrderSelect,
  showStoreColumn = false 
}: VirtualizedOrdersTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5, // Number of items to render outside of visible area
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="rounded-lg border bg-white">
      {/* Table Header */}
      <div className="border-b bg-gray-50">
        <div className="flex items-center px-4 py-3 text-sm font-medium text-gray-700">
          <div className="w-32">Order</div>
          {showStoreColumn && <div className="w-40">Store</div>}
          <div className="w-32">Date</div>
          <div className="flex-1">Customer</div>
          <div className="w-32">Status</div>
          <div className="w-32 text-right">Total</div>
        </div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
        style={{
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const order = orders[virtualItem.index];
            
            return (
              <div
                key={`${order.shopId || 'single'}-${order.id}`}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="flex items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onOrderSelect(order)}
              >
                <div className="w-32 font-medium text-gray-900">
                  #{order.number}
                </div>
                
                {showStoreColumn && order.shopName && (
                  <div className="w-40 flex items-center gap-2">
                    <Store className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600 truncate">{order.shopName}</span>
                  </div>
                )}
                
                <div className="w-32 text-sm text-gray-600">
                  {format(new Date(order.date_created), 'MMM dd, yyyy')}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {order.customer.first_name} {order.customer.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{order.customer.email}</p>
                </div>
                
                <div className="w-32">
                  <OrderStatusBadge status={order.status} />
                </div>
                
                <div className="w-32 text-right font-medium text-gray-900">
                  {formatCurrency(order.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <p className="text-sm text-gray-600">
          Showing {orders.length} orders
        </p>
      </div>
    </div>
  );
}
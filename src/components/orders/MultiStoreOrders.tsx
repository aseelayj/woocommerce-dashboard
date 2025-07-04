import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InfiniteScrollOrdersTable } from '@/components/orders/InfiniteScrollOrdersTable';
import { Shop, Order } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { format } from 'date-fns';
import { apiCache } from '@/lib/cache';
import { getTranslatedStatus } from '@/lib/translations';

interface MultiStoreOrdersProps {
  shops: Shop[];
  onOrderSelect: (order: Order & { shopName?: string; shopId?: string }) => void;
  onDownloadInvoice?: (order: Order & { shopName?: string; shopId?: string }) => void;
}

interface OrderWithShop extends Order {
  shopName: string;
  shopId: string;
}

export function MultiStoreOrders({ shops, onOrderSelect, onDownloadInvoice }: MultiStoreOrdersProps) {
  const [orders, setOrders] = useState<OrderWithShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shopFilter, setShopFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [, setTotalOrders] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), 0, 1), // January 1st of current year
      to: now
    };
  });

  useEffect(() => {
    // Reset when filters change
    setOrders([]);
    setCurrentPage(1);
    setHasMore(true);
    setTotalOrders(0);
    loadAllShopsOrders(1);
  }, [shops, dateRange, statusFilter, shopFilter]);

  const loadAllShopsOrders = async (page = currentPage, append = false) => {
    if (!shops.length) return;

    if (!append) {
      setLoading(true);
    }
    setLoadingShops([]);

    try {
      // Prepare date filters
      const dateFilters: any = {};
      if (dateRange?.from) {
        dateFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        dateFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }
      if (statusFilter) {
        dateFilters.status = statusFilter;
      }

      // Filter shops if needed
      const shopsToLoad = shopFilter 
        ? shops.filter(shop => shop.id === shopFilter)
        : shops.filter(shop => shop.isActive);

      // Fetch orders from all shops in parallel
      const ordersPromises = shopsToLoad.map(async (shop) => {
        setLoadingShops(prev => [...prev, shop.name]);
        
        try {
          const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
          
          // Get orders for current page
          const response = await api.getOrders(dateFilters, {
            page: page,
            limit: 20, // Smaller limit for progressive loading
            sortBy: 'date_created',
            sortOrder: 'desc'
          });

          // Track total orders
          if (page === 1) {
            setTotalOrders(prev => prev + response.total);
          }

          // Check if there are more pages
          if (response.orders.length < 20 || page >= response.totalPages) {
            setHasMore(false);
          }

          // Add shop info to each order
          return {
            orders: response.orders.map(order => ({
              ...order,
              shopName: shop.name,
              shopId: shop.id
            })),
            hasMore: page < response.totalPages
          };
        } catch (error) {
          console.error(`Error loading orders for ${shop.name}:`, error);
          return { orders: [], hasMore: false };
        } finally {
          setLoadingShops(prev => prev.filter(name => name !== shop.name));
        }
      });

      const allResults = await Promise.all(ordersPromises);
      const combinedOrders = allResults.flatMap(r => r.orders);
      const anyHasMore = allResults.some(r => r.hasMore);

      // Sort all orders by date
      combinedOrders.sort((a, b) => 
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      );

      if (append) {
        setOrders(prev => [...prev, ...combinedOrders]);
      } else {
        setOrders(combinedOrders);
      }
      
      setHasMore(anyHasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading multi-store orders:', error);
      if (!append) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    await loadAllShopsOrders(currentPage + 1, true);
  };

  // Filter orders based on search
  const filteredOrders = orders.filter(order => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.number.toLowerCase().includes(searchLower) ||
      order.customer.first_name.toLowerCase().includes(searchLower) ||
      order.customer.last_name.toLowerCase().includes(searchLower) ||
      order.customer.email.toLowerCase().includes(searchLower) ||
      order.shopName.toLowerCase().includes(searchLower)
    );
  });




  const activeShops = shops.filter(s => s.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Stores Orders</h2>
            <p className="text-gray-600">Orders from {activeShops.length} active stores</p>
          </div>
          <div className="flex items-center gap-2">
            {loadingShops.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Loading: {loadingShops.join(', ')}
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                apiCache.clear();
                loadAllShopsOrders();
              }}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search orders by number, customer, or store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">{getTranslatedStatus('pending')}</SelectItem>
              <SelectItem value="processing">{getTranslatedStatus('processing')}</SelectItem>
              <SelectItem value="completed">{getTranslatedStatus('completed')}</SelectItem>
              <SelectItem value="on-hold">{getTranslatedStatus('on-hold')}</SelectItem>
              <SelectItem value="cancelled">{getTranslatedStatus('cancelled')}</SelectItem>
              <SelectItem value="refunded">{getTranslatedStatus('refunded')}</SelectItem>
              <SelectItem value="failed">{getTranslatedStatus('failed')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={shopFilter || "all"} onValueChange={(value) => setShopFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              {shops.map(shop => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            value={dateRange}
            onValueChange={setDateRange}
          />
        </div>
      </div>

      {/* Orders count */}
      <div className="text-sm text-gray-600">
        Showing {filteredOrders.length} orders
        {search && ` (filtered from ${orders.length} total)`}
      </div>

      {/* Virtualized Orders Table */}
      {loading && orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading orders from all stores...</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8">
          <p className="text-center text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          <InfiniteScrollOrdersTable 
            orders={filteredOrders} 
            onOrderSelect={onOrderSelect}
            showStoreColumn={true}
            loadMore={loadMore}
            hasMore={hasMore && filteredOrders.length > 0}
            loading={loading}
            shops={shops}
            onDownloadInvoice={onDownloadInvoice}
          />
          
          {/* Status Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <p>
              Showing {filteredOrders.length} orders
              {search && ` (filtered from ${orders.length} loaded)`}
            </p>
            {loadingShops.length > 0 && (
              <div className="flex items-center gap-2 text-gray-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Loading from: {loadingShops.join(', ')}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { getTranslatedStatus } from '@/lib/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InfiniteScrollOrdersTable } from '@/components/orders/InfiniteScrollOrdersTable';
import { Order, FilterOptions, PaginationOptions, Shop } from '@/types';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  total: number;
  onOrderSelect: (order: Order) => void;
  onFiltersChange: (filters: FilterOptions) => void;
  onPaginationChange: (pagination: PaginationOptions) => void;
  filters: FilterOptions;
  pagination: PaginationOptions;
  shop?: Shop | null;
  onDownloadInvoice?: (order: Order) => void;
}

export function OrdersTable({
  orders,
  loading,
  total,
  onOrderSelect,
  onFiltersChange,
  onPaginationChange,
  filters,
  pagination,
  shop,
  onDownloadInvoice,
}: OrdersTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.dateFrom && filters.dateTo) {
      return {
        from: new Date(filters.dateFrom),
        to: new Date(filters.dateTo)
      };
    }
    return undefined;
  });
  
  // Initialize date range on mount if not set
  useEffect(() => {
    if (!dateRange && filters.dateFrom && filters.dateTo) {
      setDateRange({
        from: new Date(filters.dateFrom),
        to: new Date(filters.dateTo)
      });
    }
  }, [filters.dateFrom, filters.dateTo]);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setLocalSearch(value);
    
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Set new timer for debounced search
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
      onPaginationChange({ ...pagination, page: 1 });
    }, 500); // 500ms debounce
    
    setSearchDebounceTimer(timer);
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ 
      ...filters, 
      status: status === 'all' ? undefined : status as any 
    });
    onPaginationChange({ ...pagination, page: 1 });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onFiltersChange({
      ...filters,
      dateFrom: range?.from?.toISOString().split('T')[0],
      dateTo: range?.to?.toISOString().split('T')[0],
    });
    onPaginationChange({ ...pagination, page: 1 });
  };

  const handleLoadMore = async () => {
    if (pagination.page * pagination.limit < total) {
      onPaginationChange({ 
        ...pagination, 
        page: pagination.page + 1
      });
    }
  };


  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search orders by number, customer name, or email..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select 
            value={filters.status || 'all'} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">{getTranslatedStatus('pending')}</SelectItem>
              <SelectItem value="processing">{getTranslatedStatus('processing')}</SelectItem>
              <SelectItem value="on-hold">{getTranslatedStatus('on-hold')}</SelectItem>
              <SelectItem value="completed">{getTranslatedStatus('completed')}</SelectItem>
              <SelectItem value="cancelled">{getTranslatedStatus('cancelled')}</SelectItem>
              <SelectItem value="refunded">{getTranslatedStatus('refunded')}</SelectItem>
              <SelectItem value="failed">{getTranslatedStatus('failed')}</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            value={dateRange}
            onValueChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading orders...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8">
          <p className="text-center text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          {/* Infinite Scroll Table */}
          <InfiniteScrollOrdersTable 
            orders={orders} 
            onOrderSelect={onOrderSelect}
            loadMore={handleLoadMore}
            hasMore={orders.length < total}
            loading={loading}
            shop={shop}
            onDownloadInvoice={onDownloadInvoice}
          />

          {/* Status Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <p>
              Loaded {orders.length} of {total} orders
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
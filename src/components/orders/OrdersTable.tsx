import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from './OrderStatusBadge';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Eye,
  MoreHorizontal,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  Download,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Order, OrderStatus, FilterOptions, PaginationOptions } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  total: number;
  onOrderSelect: (order: Order) => void;
  onFiltersChange: (filters: FilterOptions) => void;
  onPaginationChange: (pagination: PaginationOptions) => void;
  filters: FilterOptions;
  pagination: PaginationOptions;
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
}: OrdersTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const processingOrders = orders.filter(order => order.status === 'processing').length;

    return {
      totalRevenue,
      completedOrders,
      pendingOrders,
      processingOrders,
    };
  }, [orders]);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusFilter = (status: string) => {
    onFiltersChange({ 
      ...filters, 
      status: status === 'all' ? undefined : status as OrderStatus 
    });
  };

  const handleSort = (field: string) => {
    const newSortOrder = 
      pagination.sortBy === field && pagination.sortOrder === 'desc' ? 'asc' : 'desc';
    
    onPaginationChange({
      ...pagination,
      sortBy: field,
      sortOrder: newSortOrder,
    });
  };

  const handleDownloadInvoice = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    // Simulate invoice download
    toast.success(`Invoice for order #${order.number} downloaded`);
    
    // In a real implementation, this would generate and download the actual invoice
    const invoiceData = {
      orderNumber: order.number,
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      total: order.total,
      date: order.date_created
    };
    
    console.log('Downloading invoice:', invoiceData);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (pagination.sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    return pagination.sortOrder === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Orders</CardTitle>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {orders.length} showing
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Revenue</CardTitle>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue.toString())}</div>
            <p className="text-xs text-gray-500 mt-1">
              From current page
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Completed</CardTitle>
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.completedOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600">Processing</CardTitle>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.processingOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl font-bold text-gray-900">Orders Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Track and manage your WooCommerce orders
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search orders, customers..."
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status || 'all'}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger className="w-full md:w-40 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block md:hidden">
            {loading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4 border border-gray-100 rounded-lg animate-pulse">
                    <div className="flex justify-between items-start mb-2">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No orders found</p>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onOrderSelect(order)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">#{order.number}</p>
                        <p className="text-sm text-gray-600">{order.customer.first_name} {order.customer.last_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{format(new Date(order.date_created), 'MMM dd, yyyy')}</span>
                      <span>{order.payment_method_title}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleDownloadInvoice(order, e)}
                        className="flex-1 gap-2 text-xs"
                      >
                        <Download className="h-3 w-3" />
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOrderSelect(order);
                        }}
                        className="flex-1 gap-2 text-xs"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="w-24 font-semibold text-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 font-semibold text-gray-700 hover:text-gray-900"
                      onClick={() => handleSort('id')}
                    >
                      Order
                      <SortIcon field="id" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 font-semibold text-gray-700 hover:text-gray-900"
                      onClick={() => handleSort('customer')}
                    >
                      Customer
                      <SortIcon field="customer" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 font-semibold text-gray-700 hover:text-gray-900"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      <SortIcon field="status" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 font-semibold text-gray-700 hover:text-gray-900"
                      onClick={() => handleSort('date_created')}
                    >
                      Date
                      <SortIcon field="date_created" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 font-semibold text-gray-700 hover:text-gray-900"
                      onClick={() => handleSort('total')}
                    >
                      Total
                      <SortIcon field="total" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                  <TableHead className="font-semibold text-gray-700">Invoice</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="border-gray-100">
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900">No orders found</p>
                          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-gray-50 transition-colors border-gray-100"
                      onClick={() => onOrderSelect(order)}
                    >
                      <TableCell className="font-semibold text-gray-900">
                        #{order.number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.customer.first_name} {order.customer.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.customer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(order.date_created), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(order.date_created), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{order.payment_method_title}</p>
                          {order.transaction_id && (
                            <p className="text-xs text-gray-500 font-mono">
                              {order.transaction_id.slice(0, 12)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadInvoice(order, e)}
                          className="gap-2 border-gray-200 hover:bg-gray-50"
                        >
                          <Download className="h-3 w-3" />
                          Invoice
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOrderSelect(order)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDownloadInvoice(order, e)} className="cursor-pointer">
                              <FileText className="mr-2 h-4 w-4" />
                              Download Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
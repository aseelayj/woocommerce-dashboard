import { useState, useEffect } from 'react';
import { Shop, Order } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface OrdersDebugViewProps {
  shops: Shop[];
}

export function OrdersDebugView({ shops }: OrdersDebugViewProps) {
  const [ordersByStore, setOrdersByStore] = useState<Record<string, Order[]>>({});
  const [allOrdersCombined, setAllOrdersCombined] = useState<(Order & { shopName: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'combined' | 'by-store'>('combined');

  const loadAllOrders = async () => {
    setLoading(true);
    const results: Record<string, Order[]> = {};
    const totalCounts: Record<string, number> = {};
    const allOrdersList: (Order & { shopName: string })[] = [];

    try {
      const activeShops = shops.filter(shop => shop.isActive);
      
      await Promise.all(
        activeShops.map(async (shop) => {
          try {
            const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
            
            // Get ALL orders - increase limit to get more
            const response = await api.getOrders(
              {},
              {
                page: 1,
                limit: 100, // Get up to 100 orders per store
                sortBy: 'date_created',
                sortOrder: 'desc'
              }
            );
            
            // Sort each store's orders by date
            const sortedOrders = response.orders.sort((a, b) => 
              new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
            );
            
            results[shop.name] = sortedOrders;
            totalCounts[shop.name] = response.total;
            
            // Add to combined list with shop name
            sortedOrders.forEach(order => {
              allOrdersList.push({ ...order, shopName: shop.name });
            });
          } catch (error) {
            console.error(`Error loading orders for ${shop.name}:`, error);
            results[shop.name] = [];
            totalCounts[shop.name] = 0;
          }
        })
      );

      // Remove duplicates based on order ID and sort by date
      const uniqueOrdersMap = new Map<number, Order & { shopName: string }>();
      allOrdersList.forEach(order => {
        if (!uniqueOrdersMap.has(order.id) || 
            new Date(order.date_created) > new Date(uniqueOrdersMap.get(order.id)!.date_created)) {
          uniqueOrdersMap.set(order.id, order);
        }
      });
      
      const uniqueOrders = Array.from(uniqueOrdersMap.values()).sort((a, b) => 
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      );

      setOrdersByStore(results);
      setAllOrdersCombined(uniqueOrders);
      setTotals(totalCounts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllOrders();
  }, [shops]);

  const totalOrdersLoaded = Object.values(ordersByStore).reduce((sum, orders) => sum + orders.length, 0);
  const totalOrdersInAPI = Object.values(totals).reduce((sum, count) => sum + count, 0);
  const uniqueOrderCount = allOrdersCombined.length;

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Orders Debug View</h1>
            <p className="text-gray-600">
              Showing {uniqueOrderCount} unique orders (from {totalOrdersLoaded} total) | API reports {totalOrdersInAPI} orders from {shops.filter(s => s.isActive).length} stores
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'combined' ? 'default' : 'outline'}
              onClick={() => setViewMode('combined')}
            >
              Combined View
            </Button>
            <Button 
              variant={viewMode === 'by-store' ? 'default' : 'outline'}
              onClick={() => setViewMode('by-store')}
            >
              By Store
            </Button>
            <Button onClick={loadAllOrders} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
          </div>
        </div>

        {/* Store Sections */}
        {Object.entries(ordersByStore).map(([storeName, orders]) => (
          <div key={storeName} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 bg-gray-100 p-2">
              {storeName} ({orders.length} orders shown / {totals[storeName]} total)
            </h2>
            
            {orders.length === 0 ? (
              <p className="text-gray-500 italic p-2">No orders found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border">Order #</th>
                    <th className="text-left p-2 border">Date</th>
                    <th className="text-left p-2 border">Customer</th>
                    <th className="text-left p-2 border">Status</th>
                    <th className="text-right p-2 border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{order.number}</td>
                      <td className="p-2 border">
                        {format(new Date(order.date_created), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="p-2 border">
                        {order.customer.first_name} {order.customer.last_name}
                        <br />
                        <span className="text-xs text-gray-500">{order.customer.email}</span>
                      </td>
                      <td className="p-2 border">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-2 border text-right">
                        {order.currency} {order.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading orders...</span>
          </div>
        )}
      </div>
    </div>
  );
}
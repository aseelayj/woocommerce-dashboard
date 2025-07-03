import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { HeaderWithAuth } from '@/components/dashboard/HeaderWithAuth';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { MultiStoreDashboardWithQuery as MultiStoreDashboard } from '@/components/dashboard/MultiStoreDashboardWithQuery';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { MultiStoreOrders } from '@/components/orders/MultiStoreOrders';
import { OrderDetailsDrawer } from '@/components/orders/OrderDetailsDrawer';
import { ShopForm } from '@/components/shops/ShopForm';
import { Settings } from '@/components/settings/Settings';
import { WooCommerceAPI, shopAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { Shop, Order, FilterOptions, PaginationOptions, OrderStatus } from '@/types';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type ActiveView = 'dashboard' | 'orders' | 'settings';

function App() {
  // State management
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [viewAllStores, setViewAllStores] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prevFilters, setPrevFilters] = useState<FilterOptions | null>(null);

  // Filters and pagination
  const now = new Date();
  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st of current year
    dateTo: now.toISOString().split('T')[0] // Today
  });
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    limit: 50,
    sortBy: 'date_created',
    sortOrder: 'desc',
  });

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Track if we should append or replace orders
  const [shouldAppend, setShouldAppend] = useState(false);

  // Load orders when active shop or filters change
  useEffect(() => {
    if (activeShop && activeView === 'orders') {
      // Reset orders when filters change (compare actual values, not object reference)
      const filtersChanged = prevFilters && (
        filters.dateFrom !== prevFilters.dateFrom ||
        filters.dateTo !== prevFilters.dateTo ||
        filters.status !== prevFilters.status ||
        filters.search !== prevFilters.search
      );
      
      if (filtersChanged || !prevFilters) {
        setOrders([]);
        setShouldAppend(false);
        setPrevFilters(filters);
        if (filtersChanged) {
          setPagination(prev => ({ ...prev, page: 1 }));
        }
      }
      loadOrders(shouldAppend);
    }
  }, [activeShop, filters, pagination, activeView]);

  const initializeData = async () => {
    try {
      const shopsData = await shopAPI.getShops();
      setShops(shopsData);
      
      // Set first active shop as default
      const firstActiveShop = shopsData.find(shop => shop.isActive);
      if (firstActiveShop) {
        setActiveShop(firstActiveShop);
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const loadOrders = async (append = false) => {
    if (!activeShop) return;

    setLoading(true);
    try {
      const api = new WooCommerceAPI(isUsingRealAPI() ? activeShop.id : activeShop);
      const response = await api.getOrders(filters, pagination);
      
      if (append && pagination.page > 1) {
        // Append new orders to existing ones
        setOrders(prev => [...prev, ...response.orders]);
      } else {
        // Replace orders (for first page or filter changes)
        setOrders(response.orders);
      }
      
      setTotalOrders(response.total);
    } catch (error) {
      console.error('Error loading orders:', error);
      if (!append) {
        setOrders([]);
        setTotalOrders(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelect = (shop: Shop) => {
    setActiveShop(shop);
    setViewAllStores(false);
    setSelectedOrder(null);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    // Reset orders and pagination when switching shops
    setOrders([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewChange = (view: ActiveView, options?: { filters?: Partial<FilterOptions> }) => {
    setActiveView(view);
    setSelectedOrder(null);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    if (view === 'orders') {
      // Reset orders and pagination when switching to orders view
      setOrders([]);
      setShouldAppend(false);
      setPagination(prev => ({ ...prev, page: 1 }));
      
      // Apply any filters passed with the navigation
      if (options?.filters) {
        setFilters(prev => ({ ...prev, ...options.filters }));
      }
    }
  };

  const handleAddShop = () => {
    setEditingShop(null);
    setShowShopForm(true);
    setSidebarOpen(false);
  };

  const handleEditShop = (shop: Shop) => {
    setEditingShop(shop);
    setShowShopForm(true);
    setSidebarOpen(false);
  };

  const handleShopSave = (savedShop: Shop) => {
    if (editingShop) {
      // Update existing shop
      setShops(prev => prev.map(shop => 
        shop.id === savedShop.id ? savedShop : shop
      ));
      if (activeShop?.id === savedShop.id) {
        setActiveShop(savedShop);
      }
    } else {
      // Add new shop
      setShops(prev => [...prev, savedShop]);
      if (!activeShop) {
        setActiveShop(savedShop);
      }
    }
    setShowShopForm(false);
    setEditingShop(null);
  };

  const handleOrderStatusUpdate = async (orderId: number, status: OrderStatus) => {
    if (!activeShop) return;

    try {
      const api = new WooCommerceAPI(isUsingRealAPI() ? activeShop.id : activeShop);
      const updatedOrder = await api.updateOrderStatus(orderId, status);
      
      if (updatedOrder) {
        // Update orders list
        setOrders(prev => prev.map(order => 
          order.id === orderId ? updatedOrder : order
        ));
        
        // Update selected order if it's the one being updated
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleRefresh = () => {
    if (activeView === 'orders') {
      setOrders([]);
      setShouldAppend(false);
      setPagination(prev => ({ ...prev, page: 1 }));
      loadOrders(false);
    }
  };

  const renderMainContent = () => {
    if (!activeShop && !viewAllStores) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="space-y-6 max-w-md">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">🏪</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Shop Connected</h3>
              <p className="text-gray-600 text-sm md:text-base">
                Connect your first WooCommerce shop to start managing orders and tracking your business
              </p>
            </div>
            <button
              onClick={handleAddShop}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Add Your First Shop
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        if (viewAllStores) {
          return <MultiStoreDashboard shops={shops} />;
        }
        return <Dashboard activeShop={activeShop} onViewChange={setActiveView} />;
      case 'orders':
        if (viewAllStores) {
          return (
            <MultiStoreOrders 
              shops={shops} 
              onOrderSelect={(order) => {
                // Set the selected order without the shop info for the drawer
                const { shopName, shopId, ...orderWithoutShop } = order;
                setSelectedOrder(orderWithoutShop);
              }}
            />
          );
        }
        return (
          <OrdersTable
            orders={orders}
            loading={loading}
            total={totalOrders}
            onOrderSelect={setSelectedOrder}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              setOrders([]); // Clear orders when filters change
              setShouldAppend(false);
            }}
            onPaginationChange={(newPagination) => {
              // Check if we're loading more (next page) or changing pages
              if (newPagination.page > pagination.page) {
                setShouldAppend(true);
              } else {
                setShouldAppend(false);
                setOrders([]);
              }
              setPagination(newPagination);
            }}
            filters={filters}
            pagination={pagination}
          />
        );
      case 'settings':
        return (
          <Settings
            shops={shops}
            activeShop={activeShop}
            onAddShop={handleAddShop}
            onEditShop={handleEditShop}
            onShopUpdate={setShops}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          shops={shops}
          activeShop={activeShop}
          activeView={activeView}
          viewAllStores={viewAllStores}
          onShopSelect={handleShopSelect}
          onViewChange={handleViewChange}
          onAddShop={handleAddShop}
          onEditShop={handleEditShop}
          onViewAllStores={() => {
            setViewAllStores(true);
            setActiveShop(null);
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="font-bold text-lg text-gray-900">WooCommerce</h1>
            {viewAllStores ? (
              <p className="text-xs text-gray-500">All Stores</p>
            ) : activeShop ? (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{activeShop.name}</p>
            ) : null}
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Header - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          {isUsingRealAPI() ? (
            <HeaderWithAuth
              activeShop={viewAllStores ? null : activeShop}
              activeView={activeView}
              onRefresh={handleRefresh}
              isLoading={loading}
            />
          ) : (
            <Header
              activeShop={viewAllStores ? null : activeShop}
              activeView={activeView}
              onRefresh={handleRefresh}
              isLoading={loading}
            />
          )}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {renderMainContent()}
          </div>
        </main>
      </div>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusUpdate={handleOrderStatusUpdate}
        shop={activeShop || undefined}
      />

      {/* Shop Form Dialog */}
      <ShopForm
        shop={editingShop || undefined}
        open={showShopForm}
        onClose={() => {
          setShowShopForm(false);
          setEditingShop(null);
        }}
        onSave={handleShopSave}
      />

      {/* Toast Notifications */}
      <Toaster richColors position="top-right" />
    </div>
    </ErrorBoundary>
  );
}

export default App;
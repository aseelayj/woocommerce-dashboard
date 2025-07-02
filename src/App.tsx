import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailsDrawer } from '@/components/orders/OrderDetailsDrawer';
import { ShopForm } from '@/components/shops/ShopForm';
import { WooCommerceAPI, shopAPI } from '@/lib/api';
import { Shop, Order, FilterOptions, PaginationOptions, OrderStatus } from '@/types';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActiveView = 'dashboard' | 'orders' | 'settings';

function App() {
  // State management
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterOptions>({});
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    sortBy: 'date_created',
    sortOrder: 'desc',
  });

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Load orders when active shop or filters change
  useEffect(() => {
    if (activeShop && activeView === 'orders') {
      loadOrders();
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

  const loadOrders = async () => {
    if (!activeShop) return;

    setLoading(true);
    try {
      const api = new WooCommerceAPI(activeShop);
      const response = await api.getOrders(filters, pagination);
      setOrders(response.orders);
      setTotalOrders(response.total);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelect = (shop: Shop) => {
    setActiveShop(shop);
    setSelectedOrder(null);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    // Reset pagination when switching shops
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    setSelectedOrder(null);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    if (view === 'orders') {
      // Reset pagination when switching to orders view
      setPagination(prev => ({ ...prev, page: 1 }));
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
      const api = new WooCommerceAPI(activeShop);
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
      loadOrders();
    }
  };

  const renderMainContent = () => {
    if (!activeShop) {
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
        return <Dashboard activeShop={activeShop} />;
      case 'orders':
        return (
          <OrdersTable
            orders={orders}
            loading={loading}
            total={totalOrders}
            onOrderSelect={setSelectedOrder}
            onFiltersChange={setFilters}
            onPaginationChange={setPagination}
            filters={filters}
            pagination={pagination}
          />
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Settings</h3>
              <p className="text-gray-600">Shop settings and configuration options coming soon</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
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
          onShopSelect={handleShopSelect}
          onViewChange={handleViewChange}
          onAddShop={handleAddShop}
          onEditShop={handleEditShop}
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
            {activeShop && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{activeShop.name}</p>
            )}
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Header - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <Header
            activeShop={activeShop}
            activeView={activeView}
            onRefresh={handleRefresh}
            isLoading={loading}
          />
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
      />

      {/* Shop Form Dialog */}
      <ShopForm
        shop={editingShop}
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
  );
}

export default App;
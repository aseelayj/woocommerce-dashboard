import { Order, OrdersResponse, FilterOptions, PaginationOptions, Shop } from '@/types';
import { demoOrders, demoShops } from '@/data/demo';

// Simulate API delay for realistic UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class WooCommerceAPI {
  private shop: Shop;

  constructor(shop: Shop) {
    this.shop = shop;
  }

  async getOrders(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {
      page: 1,
      limit: 10,
      sortBy: 'date_created',
      sortOrder: 'desc',
    }
  ): Promise<OrdersResponse> {
    let filteredOrders = [...demoOrders];

    // Apply status filter
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.number.toLowerCase().includes(searchTerm) ||
        order.customer.first_name.toLowerCase().includes(searchTerm) ||
        order.customer.last_name.toLowerCase().includes(searchTerm) ||
        order.customer.email.toLowerCase().includes(searchTerm) ||
        order.billing.email.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.date_created) >= new Date(filters.dateFrom!)
      );
    }
    if (filters.dateTo) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.date_created) <= new Date(filters.dateTo!)
      );
    }

    // Apply sorting
    filteredOrders.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (pagination.sortBy) {
        case 'date_created':
          aValue = new Date(a.date_created).getTime();
          bValue = new Date(b.date_created).getTime();
          break;
        case 'number':
          aValue = parseInt(a.number.replace('#', ''));
          bValue = parseInt(b.number.replace('#', ''));
          break;
        case 'total':
          aValue = parseFloat(a.total);
          bValue = parseFloat(b.total);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (pagination.sortOrder === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    // Apply pagination
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedOrders = filteredOrders.slice(start, end);

    await delay(Math.random() * 500 + 200);

    return {
      orders: paginatedOrders,
      total: filteredOrders.length,
      totalPages: Math.ceil(filteredOrders.length / pagination.limit),
    };
  }

  async getOrder(orderId: number): Promise<Order | null> {
    await delay(300);
    return demoOrders.find(order => order.id === orderId) || null;
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<Order | null> {
    await delay(500);
    
    const order = demoOrders.find(o => o.id === orderId);
    if (!order) return null;
    
    // In a real implementation, this would update the order via API
    // For demo, we'll just return the order with updated status
    return {
      ...order,
      status,
      date_modified: new Date().toISOString(),
    };
  }

  async getSystemStatus() {
    await delay(300);
    return {
      environment: {
        active_plugins: [],
        theme: 'storefront',
      },
      database: {
        wc_database_version: '5.5.0',
      },
    };
  }

  async testConnection(): Promise<boolean> {
    await delay(500);
    // For demo mode, always return true
    return true;
  }

  async getStoreInfo() {
    await delay(300);
    // Return mock store info for demo mode
    return {
      store_name: this.shop.name,
      store_address: '',
      store_city: '',
      store_country: 'US',
      store_postcode: '',
      store_email: `support@${new URL(this.shop.baseUrl).hostname}`,
      currency: 'USD',
      currency_symbol: '$',
      timezone: 'America/New_York'
    };
  }

  async getSalesReport(_params?: { 
    period?: 'week' | 'month' | 'last_month' | 'year'; 
    date_min?: string; 
    date_max?: string 
  }) {
    await delay(500);
    
    // For demo purposes, return mock sales data
    return {
      total_sales: '125430.00',
      total_orders: '342',
      total_items: '1205',
      total_tax: '12543.00',
      total_shipping: '2340.00',
      total_refunds: '0',
      total_discount: '3450.00',
      totals_grouped_by: 'day',
      totals: {},
    };
  }

  async getOrdersTotals() {
    await delay(300);
    
    // Count orders by status from demo data
    const totals = demoOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(totals).map(([slug, total]) => ({
      slug,
      total,
    }));
  }

  async getInvoiceDownloadUrl(orderId: number): Promise<string | null> {
    // Mock implementation - return null since mock data doesn't have real invoices
    console.log('Mock API: getInvoiceDownloadUrl called for order', orderId);
    return null;
  }
}

// Shop management functions
export const shopAPI = {
  async getShops(): Promise<Shop[]> {
    await delay(500);
    return demoShops;
  },

  async getShop(id: string): Promise<Shop | null> {
    await delay(300);
    return demoShops.find(shop => shop.id === id) || null;
  },

  async createShop(shopData: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
    await delay(700);
    const newShop: Shop = {
      ...shopData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    demoShops.push(newShop);
    return newShop;
  },

  async updateShop(id: string, shopData: Partial<Shop>): Promise<Shop | null> {
    await delay(500);
    const shopIndex = demoShops.findIndex(shop => shop.id === id);
    if (shopIndex === -1) return null;
    
    demoShops[shopIndex] = { ...demoShops[shopIndex], ...shopData };
    return demoShops[shopIndex];
  },

  async deleteShop(id: string): Promise<boolean> {
    await delay(500);
    const shopIndex = demoShops.findIndex(shop => shop.id === id);
    if (shopIndex === -1) return false;
    
    demoShops.splice(shopIndex, 1);
    return true;
  },

  async testConnection(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<boolean> {
    await delay(1500); // Longer delay for connection testing
    
    // Enhanced validation for demo purposes
    const hasValidUrl = shop.baseUrl && (shop.baseUrl.startsWith('http://') || shop.baseUrl.startsWith('https://'));
    const hasValidKey = shop.consumerKey && shop.consumerKey.startsWith('ck_') && shop.consumerKey.length > 10;
    const hasValidSecret = shop.consumerSecret && shop.consumerSecret.startsWith('cs_') && shop.consumerSecret.length > 10;
    
    return !!(hasValidUrl && hasValidKey && hasValidSecret);
  },
};
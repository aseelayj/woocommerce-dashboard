import { Order, OrdersResponse, FilterOptions, PaginationOptions, Shop } from '@/types';
import { demoOrders, demoShops } from '@/data/demo';

// Simulate API delay for realistic UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class WooCommerceAPI {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(shop: Shop) {
    this.baseUrl = shop.baseUrl;
    this.consumerKey = shop.consumerKey;
    this.consumerSecret = shop.consumerSecret;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // In a real implementation, this would make actual HTTP requests to WooCommerce REST API
    // For demo purposes, we'll simulate API responses with realistic data
    await delay(Math.random() * 500 + 200); // Random delay between 200-700ms
    
    if (endpoint.includes('/orders')) {
      return this.getMockOrdersResponse();
    }
    
    throw new Error(`Endpoint ${endpoint} not implemented`);
  }

  private getMockOrdersResponse(): OrdersResponse {
    return {
      orders: demoOrders,
      total: demoOrders.length,
      totalPages: Math.ceil(demoOrders.length / 10),
    };
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
        order.billing.company.toLowerCase().includes(searchTerm) ||
        order.payment_method_title.toLowerCase().includes(searchTerm)
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
          aValue = new Date(a.date_created);
          bValue = new Date(b.date_created);
          break;
        case 'total':
          aValue = parseFloat(a.total);
          bValue = parseFloat(b.total);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'customer':
          aValue = `${a.customer.first_name} ${a.customer.last_name}`;
          bValue = `${b.customer.first_name} ${b.customer.last_name}`;
          break;
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (pagination.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    await delay(100); // Final processing delay

    return {
      orders: paginatedOrders,
      total: filteredOrders.length,
      totalPages: Math.ceil(filteredOrders.length / pagination.limit),
    };
  }

  async getOrder(orderId: number): Promise<Order | null> {
    await delay(200);
    return demoOrders.find(order => order.id === orderId) || null;
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<Order | null> {
    await delay(500);
    const orderIndex = demoOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
      demoOrders[orderIndex] = {
        ...demoOrders[orderIndex],
        status,
        date_modified: new Date().toISOString()
      };
      return demoOrders[orderIndex];
    }
    return null;
  }

  async testConnection(): Promise<boolean> {
    await delay(1000);
    // Simulate connection test - in real implementation, this would test the actual API
    return this.consumerKey.startsWith('ck_') && this.consumerSecret.startsWith('cs_');
  }
}

// Enhanced Shop management API
export const shopAPI = {
  async getShops(): Promise<Shop[]> {
    await delay(200);
    return [...demoShops];
  },

  async createShop(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
    await delay(300);
    const newShop: Shop = {
      ...shop,
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    demoShops.push(newShop);
    return newShop;
  },

  async updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop | null> {
    await delay(300);
    const shopIndex = demoShops.findIndex(shop => shop.id === shopId);
    if (shopIndex !== -1) {
      demoShops[shopIndex] = { 
        ...demoShops[shopIndex], 
        ...updates,
        // Preserve original creation date
        createdAt: demoShops[shopIndex].createdAt
      };
      return demoShops[shopIndex];
    }
    return null;
  },

  async deleteShop(shopId: string): Promise<boolean> {
    await delay(200);
    const shopIndex = demoShops.findIndex(shop => shop.id === shopId);
    if (shopIndex !== -1) {
      demoShops.splice(shopIndex, 1);
      return true;
    }
    return false;
  },

  async testConnection(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<boolean> {
    await delay(1500); // Longer delay for connection testing
    
    // Enhanced validation for demo purposes
    const hasValidUrl = shop.baseUrl && (shop.baseUrl.startsWith('http://') || shop.baseUrl.startsWith('https://'));
    const hasValidKey = shop.consumerKey && shop.consumerKey.startsWith('ck_') && shop.consumerKey.length > 10;
    const hasValidSecret = shop.consumerSecret && shop.consumerSecret.startsWith('cs_') && shop.consumerSecret.length > 10;
    
    return hasValidUrl && hasValidKey && hasValidSecret;
  },
};
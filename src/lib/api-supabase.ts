import { Order, OrdersResponse, FilterOptions, PaginationOptions, Shop } from '@/types';
import { storesService } from './supabase-stores';
import { createWooCommerceAPI, WooCommerceAPI } from './woocommerce-api';
import { authService } from './supabase-auth';

// Cache for WooCommerce API instances
const apiCache = new Map<string, WooCommerceAPI>();

async function getWooCommerceAPI(storeId: string): Promise<WooCommerceAPI> {
  if (!apiCache.has(storeId)) {
    const api = await createWooCommerceAPI(storeId);
    apiCache.set(storeId, api);
  }
  return apiCache.get(storeId)!;
}

export class SupabaseWooCommerceAPI {
  private storeId: string;

  constructor(storeId: string) {
    this.storeId = storeId;
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
    const api = await getWooCommerceAPI(this.storeId);
    
    // Map sortBy to WooCommerce orderby parameter
    let orderby: string | undefined;
    switch (pagination.sortBy) {
      case 'date_created':
        orderby = 'date';
        break;
      case 'id':
        orderby = 'id';
        break;
      // Other sort fields will be handled client-side
    }
    
    // Convert our filter/pagination options to WooCommerce API parameters
    const params: any = {
      page: pagination.page,
      per_page: pagination.limit,
      orderby: orderby,
      order: pagination.sortOrder,
    };
    
    // Only add optional parameters if they're defined
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.after = filters.dateFrom;
    if (filters.dateTo) params.before = filters.dateTo;
    if (filters.search) params.search = filters.search;

    const response = await api.getOrders(params);
    
    // Transform WooCommerce orders to our Order type
    const transformedOrders: Order[] = response.orders.map((order: any) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      currency: order.currency,
      total: order.total,
      date_created: order.date_created,
      date_modified: order.date_modified,
      customer: {
        id: order.customer_id,
        first_name: order.billing.first_name || '',
        last_name: order.billing.last_name || '',
        email: order.billing.email || '',
      },
      billing: {
        first_name: order.billing.first_name || '',
        last_name: order.billing.last_name || '',
        company: order.billing.company || '',
        address_1: order.billing.address_1 || '',
        address_2: order.billing.address_2 || '',
        city: order.billing.city || '',
        state: order.billing.state || '',
        postcode: order.billing.postcode || '',
        country: order.billing.country || '',
        email: order.billing.email || '',
        phone: order.billing.phone || '',
      },
      shipping: {
        first_name: order.shipping.first_name || '',
        last_name: order.shipping.last_name || '',
        company: order.shipping.company || '',
        address_1: order.shipping.address_1 || '',
        address_2: order.shipping.address_2 || '',
        city: order.shipping.city || '',
        state: order.shipping.state || '',
        postcode: order.shipping.postcode || '',
        country: order.shipping.country || '',
      },
      payment_method: order.payment_method || '',
      payment_method_title: order.payment_method_title || '',
      line_items: order.line_items || [],
      shipping_lines: order.shipping_lines || [],
      fee_lines: order.fee_lines || [],
      coupon_lines: order.coupon_lines || [],
      tax_lines: order.tax_lines || [],
    }));

    // Sort client-side if needed for specific sort fields
    if (pagination.sortBy === 'customer' || pagination.sortBy === 'total' || pagination.sortBy === 'status') {
      transformedOrders.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (pagination.sortBy) {
          case 'customer':
            aValue = `${a.customer.first_name} ${a.customer.last_name}`;
            bValue = `${b.customer.first_name} ${b.customer.last_name}`;
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
        
        if (pagination.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return {
      orders: transformedOrders,
      total: response.total,
      totalPages: response.totalPages,
    };
  }

  async getOrder(orderId: number): Promise<Order | null> {
    const api = await getWooCommerceAPI(this.storeId);
    const order = await api.getOrder(orderId);
    
    if (!order) return null;

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      currency: order.currency,
      total: order.total,
      date_created: order.date_created,
      date_modified: order.date_modified,
      customer: {
        id: order.customer_id,
        first_name: order.billing.first_name || '',
        last_name: order.billing.last_name || '',
        email: order.billing.email || '',
      },
      billing: order.billing,
      shipping: order.shipping,
      payment_method: order.payment_method || '',
      payment_method_title: order.payment_method_title || '',
      line_items: order.line_items || [],
      shipping_lines: order.shipping_lines || [],
      fee_lines: order.fee_lines || [],
      coupon_lines: order.coupon_lines || [],
      tax_lines: order.tax_lines || [],
    };
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<Order | null> {
    const api = await getWooCommerceAPI(this.storeId);
    const updatedOrder = await api.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) return null;

    return this.getOrder(orderId);
  }

  async testConnection(): Promise<boolean> {
    try {
      const api = await getWooCommerceAPI(this.storeId);
      await api.getSystemStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSalesReport(params?: { period?: 'week' | 'month' | 'last_month' | 'year'; date_min?: string; date_max?: string }) {
    const api = await getWooCommerceAPI(this.storeId);
    return api.getSalesReport(params);
  }

  async getOrdersTotals() {
    const api = await getWooCommerceAPI(this.storeId);
    return api.getTotalsReport('orders');
  }
}

// Enhanced Shop management API with Supabase
export const shopAPI = {
  async getShops(): Promise<Shop[]> {
    const user = await authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const stores = await storesService.getStores(user.id);
    
    return stores.map(store => ({
      id: store.id,
      name: store.name,
      baseUrl: store.url,
      consumerKey: store.consumer_key,
      consumerSecret: store.consumer_secret,
      isActive: store.is_active,
      createdAt: store.created_at,
    }));
  },

  async createShop(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
    const user = await authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const newStore = await storesService.createStore({
      name: shop.name,
      url: shop.baseUrl,
      consumer_key: shop.consumerKey,
      consumer_secret: shop.consumerSecret,
      user_id: user.id,
    });

    // Clear API cache for new store
    apiCache.delete(newStore.id);

    return {
      id: newStore.id,
      name: newStore.name,
      baseUrl: newStore.url,
      consumerKey: newStore.consumer_key,
      consumerSecret: newStore.consumer_secret,
      isActive: newStore.is_active,
      createdAt: newStore.created_at,
    };
  },

  async updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop | null> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.baseUrl !== undefined) updateData.url = updates.baseUrl;
    if (updates.consumerKey !== undefined) updateData.consumer_key = updates.consumerKey;
    if (updates.consumerSecret !== undefined) updateData.consumer_secret = updates.consumerSecret;

    const updatedStore = await storesService.updateStore(shopId, updateData);

    // Clear API cache for updated store
    apiCache.delete(shopId);

    return {
      id: updatedStore.id,
      name: updatedStore.name,
      baseUrl: updatedStore.url,
      consumerKey: updatedStore.consumer_key,
      consumerSecret: updatedStore.consumer_secret,
      isActive: updatedStore.is_active,
      createdAt: updatedStore.created_at,
    };
  },

  async deleteShop(shopId: string): Promise<boolean> {
    await storesService.deleteStore(shopId);
    
    // Clear API cache for deleted store
    apiCache.delete(shopId);
    
    return true;
  },

  async testConnection(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<boolean> {
    const result = await storesService.testConnection(
      shop.baseUrl,
      shop.consumerKey,
      shop.consumerSecret
    );
    
    return result.success;
  },
};
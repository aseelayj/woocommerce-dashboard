import { Order, OrdersResponse, FilterOptions, PaginationOptions, Shop } from '@/types';
import { storesService } from './supabase-stores';
import { createWooCommerceAPI, WooCommerceAPI } from './woocommerce-api';
import { authService } from './supabase-auth';
import { getStoreLogoUrl } from '@/config/store-logos';

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
    if (filters.status) {
      // Handle both single status and array of statuses
      params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
    }
    if (filters.dateFrom) params.after = filters.dateFrom;
    if (filters.dateTo) params.before = filters.dateTo;
    if (filters.search) params.search = filters.search;

    const response = await api.getOrders(params);
    
    // Transform WooCommerce orders to our Order type
    const transformedOrders: Order[] = response.orders.map((order: any) => ({
      id: order.id,
      parent_id: order.parent_id || 0,
      number: order.number,
      order_key: order.order_key || '',
      created_via: order.created_via || '',
      version: order.version || '',
      status: order.status,
      currency: order.currency,
      date_created: order.date_created,
      date_modified: order.date_modified,
      discount_total: order.discount_total || '0',
      discount_tax: order.discount_tax || '0',
      shipping_total: order.shipping_total || '0',
      shipping_tax: order.shipping_tax || '0',
      cart_tax: order.cart_tax || '0',
      total: order.total,
      total_tax: order.total_tax || '0',
      customer_id: order.customer_id || 0,
      customer_note: order.customer_note || '',
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
      transaction_id: order.transaction_id || '',
      line_items: order.line_items || [],
      tax_lines: order.tax_lines || [],
      shipping_lines: order.shipping_lines || [],
      fee_lines: order.fee_lines || [],
      coupon_lines: order.coupon_lines || [],
      refunds: order.refunds || [],
      customer: {
        id: order.customer_id,
        username: '',
        first_name: order.billing.first_name || '',
        last_name: order.billing.last_name || '',
        email: order.billing.email || '',
      },
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

    return order;
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

  async getStoreInfo(): Promise<any> {
    try {
      const api = await getWooCommerceAPI(this.storeId);
      
      // Try to get system status which includes store info
      const systemStatus = await api.getSystemStatus();
      if (systemStatus?.environment) {
        return {
          store_name: systemStatus.environment.site_name || '',
          store_address: systemStatus.environment.site_address || '',
          store_city: systemStatus.environment.site_city || '',
          store_country: systemStatus.environment.default_country || '',
          store_postcode: systemStatus.environment.site_postcode || '',
          store_email: systemStatus.environment.admin_email || '',
          currency: systemStatus.settings?.currency || 'USD',
          currency_symbol: systemStatus.settings?.currency_symbol || '$',
          timezone: systemStatus.environment.default_timezone || ''
        };
      }
    } catch (error) {
      console.warn('Could not fetch store info from WooCommerce:', error);
    }
    
    // Fallback to store data from database
    const store = await storesService.getStore(this.storeId);
    return {
      store_name: store?.name || '',
      store_address: '',
      store_city: '',
      store_country: '',
      store_postcode: '',
      store_email: store ? `support@${new URL(store.url).hostname}` : '',
      currency: 'USD',
      currency_symbol: '$',
      timezone: ''
    };
  }

  async getInvoiceDownloadUrl(orderId: number): Promise<string | null> {
    const api = await getWooCommerceAPI(this.storeId);
    return api.getInvoiceDownloadUrl(orderId);
  }

  async getReportsSales(params?: any): Promise<any> {
    const api = await getWooCommerceAPI(this.storeId);
    try {
      // Use the getSalesReport method from WooCommerceAPI
      const response = await api.getSalesReport(params);
      return response;
    } catch (error) {
      console.warn('Error getting sales report:', error);
      return null;
    }
  }

  async getAnalyticsRevenueStats(params?: any): Promise<any> {
    const api = await getWooCommerceAPI(this.storeId);
    try {
      const response = await api.getAnalyticsRevenueStats(params);
      return response;
    } catch (error) {
      console.warn('Error getting analytics revenue stats:', error);
      return null;
    }
  }
}

// Enhanced Shop management API with Supabase
export const shopAPI = {
  async getShops(): Promise<Shop[]> {
    const user = await authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const stores = await storesService.getStores(user.id);
    
    // Check for hardcoded logos and update if needed
    // Removed logo update logic since we're using hardcoded logos
    // const shopsToUpdate: Array<{ id: string; logo_url: string }> = [];
    
    const shops = stores.map(store => {
      // Check if we have a hardcoded logo for this store
      const hardcodedLogo = getStoreLogoUrl(store.url);
      
      // No longer updating database with logos - using hardcoded mappings only
      // if (hardcodedLogo && hardcodedLogo !== store.logo_url) {
      //   shopsToUpdate.push({ id: store.id, logo_url: hardcodedLogo });
      // }
      
      return {
        id: store.id,
        name: store.name,
        baseUrl: store.url,
        consumerKey: store.consumer_key,
        consumerSecret: store.consumer_secret,
        isActive: store.is_active,
        createdAt: store.created_at,
        logoUrl: hardcodedLogo || store.logo_url, // Use hardcoded if available
      };
    });
    
    // Removed background logo updates to avoid 400 errors
    // Update stores with hardcoded logos in the background
    // if (shopsToUpdate.length > 0) {
    //   Promise.all(
    //     shopsToUpdate.map(({ id, logo_url }) =>
    //       storesService.updateStore(id, { logo_url }).catch(err =>
    //         console.error(`Failed to update logo for store ${id}:`, err)
    //       )
    //     )
    //   );
    // }
    
    return shops;
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
      logoUrl: newStore.logo_url,
    };
  },

  async updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop | null> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.baseUrl !== undefined) updateData.url = updates.baseUrl;
    if (updates.consumerKey !== undefined) updateData.consumer_key = updates.consumerKey;
    if (updates.consumerSecret !== undefined) updateData.consumer_secret = updates.consumerSecret;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

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
      logoUrl: updatedStore.logo_url,
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
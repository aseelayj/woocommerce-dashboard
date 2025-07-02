import { storesService } from './supabase-stores';
import { apiCache } from './cache';

interface WooCommerceError {
  code: string;
  message: string;
  data: {
    status: number;
  };
}

export class WooCommerceAPI {
  private baseUrl: string;
  private authHeader: string;

  constructor(url: string, consumerKey: string, consumerSecret: string) {
    // Remove trailing slash from URL if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.baseUrl = `${cleanUrl}/wp-json/wc/v3`;
    this.authHeader = `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as WooCommerceError;
        throw new Error(error.message || `WooCommerce API error: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to WooCommerce store');
      }
      throw error;
    }
  }

  // Orders endpoints
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: string | string[];
    customer?: number;
    product?: number;
    after?: string;
    before?: string;
    search?: string;
    exclude?: number[];
    include?: number[];
    parent?: number[];
    parent_exclude?: number[];
    orderby?: 'date' | 'id' | 'include' | 'title' | 'slug';
    order?: 'asc' | 'desc';
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.status) {
      if (Array.isArray(params.status)) {
        queryParams.append('status', params.status.join(','));
      } else {
        queryParams.append('status', params.status);
      }
    }
    if (params?.customer) queryParams.append('customer', params.customer.toString());
    if (params?.product) queryParams.append('product', params.product.toString());
    // WooCommerce expects ISO 8601 date format with timezone
    if (params?.after) queryParams.append('after', `${params.after}T00:00:00`);
    if (params?.before) queryParams.append('before', `${params.before}T23:59:59`);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.exclude) queryParams.append('exclude', params.exclude.join(','));
    if (params?.include) queryParams.append('include', params.include.join(','));
    if (params?.orderby) queryParams.append('orderby', params.orderby);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const cacheKey = `orders:${this.baseUrl}:${query}`;
    
    // Check cache first
    const cached = apiCache.get<any>(cacheKey);
    if (cached) {
      console.log('Returning cached orders');
      return cached;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/orders${query}`, {
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!response.ok) {
        let errorMessage = `WooCommerce API error: ${response.status}`;
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
          console.error('WooCommerce API Error:', error);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const orders = await response.json();
      const totalOrders = response.headers.get('X-WP-Total');
      const totalPages = response.headers.get('X-WP-TotalPages');

      const result = {
        orders,
        total: totalOrders ? parseInt(totalOrders) : orders.length,
        totalPages: totalPages ? parseInt(totalPages) : 1,
      };
      
      // Cache the result
      apiCache.set(cacheKey, result, 2 * 60 * 1000); // Cache for 2 minutes
      
      return result;
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to WooCommerce store. Please check CORS settings.');
      }
      throw error;
    }
  }

  async getOrder(id: number) {
    return this.request<any>(`/orders/${id}`);
  }

  async updateOrder(id: number, data: any) {
    const result = await this.request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    // Clear order cache when updating
    apiCache.clear('orders:');
    
    return result;
  }

  async updateOrderStatus(id: number, status: string) {
    return this.updateOrder(id, { status });
  }

  async deleteOrder(id: number, force: boolean = false) {
    const params = force ? '?force=true' : '';
    return this.request<any>(`/orders/${id}${params}`, {
      method: 'DELETE',
    });
  }

  async createOrder(data: any) {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Order Notes
  async getOrderNotes(orderId: number) {
    return this.request<any[]>(`/orders/${orderId}/notes`);
  }

  async createOrderNote(orderId: number, note: string, customerNote: boolean = false) {
    return this.request<any>(`/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note, customer_note: customerNote }),
    });
  }

  // Products endpoints
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    after?: string;
    before?: string;
    exclude?: number[];
    include?: number[];
    parent?: number[];
    parent_exclude?: number[];
    slug?: string;
    status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
    type?: 'simple' | 'grouped' | 'external' | 'variable';
    sku?: string;
    featured?: boolean;
    category?: string;
    tag?: string;
    shipping_class?: string;
    attribute?: string;
    attribute_term?: string;
    on_sale?: boolean;
    min_price?: string;
    max_price?: string;
    stock_status?: 'instock' | 'outofstock' | 'onbackorder';
    orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
    order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.sku) queryParams.append('sku', params.sku);
    if (params?.featured !== undefined) queryParams.append('featured', params.featured.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.on_sale !== undefined) queryParams.append('on_sale', params.on_sale.toString());
    if (params?.min_price) queryParams.append('min_price', params.min_price);
    if (params?.max_price) queryParams.append('max_price', params.max_price);
    if (params?.stock_status) queryParams.append('stock_status', params.stock_status);
    if (params?.orderby) queryParams.append('orderby', params.orderby);
    if (params?.order) queryParams.append('order', params.order);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/products${query}`);
  }

  async getProduct(id: number) {
    return this.request<any>(`/products/${id}`);
  }

  async updateProduct(id: number, data: any) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Customers endpoints
  async getCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    exclude?: number[];
    include?: number[];
    email?: string;
    role?: string;
    orderby?: 'id' | 'include' | 'name' | 'registered_date';
    order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.email) queryParams.append('email', params.email);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.orderby) queryParams.append('orderby', params.orderby);
    if (params?.order) queryParams.append('order', params.order);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/customers${query}`);
  }

  async getCustomer(id: number) {
    return this.request<any>(`/customers/${id}`);
  }

  // Reports endpoints
  async getReports() {
    return this.request<any[]>('/reports');
  }
  
  // Get total revenue efficiently
  async getTotalRevenue(params?: { after?: string; before?: string }) {
    const cacheKey = `revenue:${this.baseUrl}:${params?.after || ''}:${params?.before || ''}`;
    
    // Check cache
    const cached = apiCache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    let totalRevenue = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await this.getOrders({
          page,
          per_page: perPage,
          after: params?.after,
          before: params?.before,
          orderby: 'date',
          order: 'desc'
        });
        
        // Sum revenue from this page
        const pageRevenue = response.orders.reduce((sum: number, order: any) => 
          sum + parseFloat(order.total || '0'), 0
        );
        totalRevenue += pageRevenue;
        
        // Check if there are more pages
        hasMore = page < response.totalPages;
        page++;
        
        // Small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        break;
      }
    }
    
    // Cache for 5 minutes
    apiCache.set(cacheKey, totalRevenue, 5 * 60 * 1000);
    
    return totalRevenue;
  }

  async getSalesReport(params?: {
    period?: 'week' | 'month' | 'last_month' | 'year';
    date_min?: string;
    date_max?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.period) queryParams.append('period', params.period);
    if (params?.date_min) queryParams.append('date_min', params.date_min);
    if (params?.date_max) queryParams.append('date_max', params.date_max);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any>(`/reports/sales${query}`);
  }

  async getTopSellersReport(params?: {
    period?: 'week' | 'month' | 'last_month' | 'year';
    date_min?: string;
    date_max?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.period) queryParams.append('period', params.period);
    if (params?.date_min) queryParams.append('date_min', params.date_min);
    if (params?.date_max) queryParams.append('date_max', params.date_max);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/reports/top_sellers${query}`);
  }

  async getTotalsReport(type: 'customers' | 'coupons' | 'orders' | 'products' | 'reviews') {
    return this.request<any>(`/reports/${type}/totals`);
  }

  // Coupons endpoints
  async getCoupons(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    after?: string;
    before?: string;
    code?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.code) queryParams.append('code', params.code);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/coupons${query}`);
  }

  async getCoupon(id: number) {
    return this.request<any>(`/coupons/${id}`);
  }

  // Product Categories
  async getProductCategories(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    parent?: number;
    hide_empty?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.parent !== undefined) queryParams.append('parent', params.parent.toString());
    if (params?.hide_empty !== undefined) queryParams.append('hide_empty', params.hide_empty.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/products/categories${query}`);
  }

  // System Status
  async getSystemStatus() {
    return this.request<any>('/system_status');
  }

  // Payment Gateways
  async getPaymentGateways() {
    return this.request<any[]>('/payment_gateways');
  }

  // Shipping Zones
  async getShippingZones() {
    return this.request<any[]>('/shipping/zones');
  }

  // Tax Rates
  async getTaxRates(params?: {
    page?: number;
    per_page?: number;
    class?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.class) queryParams.append('class', params.class);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/taxes${query}`);
  }

  // Settings
  async getSettings() {
    return this.request<any[]>('/settings');
  }

  async getSettingOptions(groupId: string) {
    return this.request<any[]>(`/settings/${groupId}`);
  }

  // Webhooks
  async getWebhooks() {
    return this.request<any[]>('/webhooks');
  }
}

export async function createWooCommerceAPI(storeId: string): Promise<WooCommerceAPI> {
  const store = await storesService.getStore(storeId);
  
  if (!store) {
    throw new Error('Store not found');
  }

  return new WooCommerceAPI(store.url, store.consumer_key, store.consumer_secret);
}
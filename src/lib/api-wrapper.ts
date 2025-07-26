import { WooCommerceAPI as MockAPI, shopAPI as mockShopAPI } from './api';
import { SupabaseWooCommerceAPI, shopAPI as supabaseShopAPI } from './api-supabase';
import { Order, OrdersResponse, FilterOptions, PaginationOptions, Shop } from '@/types';

// This determines whether to use mock data or real Supabase/WooCommerce APIs
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true' || false;

// Export the appropriate API based on configuration
export class WooCommerceAPI {
  private api: MockAPI | SupabaseWooCommerceAPI;

  constructor(shopOrStoreId: Shop | string) {
    if (USE_REAL_API) {
      // For real API, we expect a store ID
      if (typeof shopOrStoreId !== 'string') {
        throw new Error('Real API mode requires store ID');
      }
      this.api = new SupabaseWooCommerceAPI(shopOrStoreId);
    } else {
      // For mock API, we expect a Shop object
      if (typeof shopOrStoreId === 'string') {
        throw new Error('Mock API mode requires Shop object');
      }
      this.api = new MockAPI(shopOrStoreId);
    }
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
    return this.api.getOrders(filters, pagination);
  }

  async getOrder(orderId: number): Promise<Order | null> {
    return this.api.getOrder(orderId);
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<Order | null> {
    return this.api.updateOrderStatus(orderId, status);
  }

  async testConnection(): Promise<boolean> {
    return this.api.testConnection();
  }

  async getSalesReport(params?: any): Promise<any> {
    return (this.api as any).getSalesReport?.(params) || { total_sales: "0", total_orders: 0 };
  }

  async getOrdersTotals(): Promise<any> {
    return (this.api as any).getOrdersTotals?.() || { total: 0 };
  }

  async getStoreInfo(): Promise<any> {
    return (this.api as any).getStoreInfo?.() || null;
  }

  async getInvoiceDownloadUrl(orderId: number): Promise<string | null> {
    return (this.api as any).getInvoiceDownloadUrl?.(orderId) || null;
  }

  async getReportsSales(params?: any): Promise<any> {
    return (this.api as any).getReportsSales?.(params) || null;
  }

  async getAnalyticsRevenueStats(params?: any): Promise<any> {
    return (this.api as any).getAnalyticsRevenueStats?.(params) || null;
  }
}

// Export the appropriate shop API based on configuration
export const shopAPI = USE_REAL_API ? supabaseShopAPI : mockShopAPI;

// Helper to check if we're using real API
export const isUsingRealAPI = () => USE_REAL_API;
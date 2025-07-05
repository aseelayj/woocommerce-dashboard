export interface Shop {
  id: string;
  name: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  isActive: boolean;
  createdAt: string;
  logoUrl?: string; // Store logo URL
  // Store info from WooCommerce (optional, fetched separately)
  storeInfo?: {
    store_name?: string;
    store_address?: string;
    store_city?: string;
    store_country?: string;
    store_postcode?: string;
    store_email?: string;
    currency?: string;
    currency_symbol?: string;
    timezone?: string;
  };
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
}

export interface BillingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface OrderItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  total: string;
  image?: string | { id: string; src: string };
  price: string;
  sku?: string;
  meta_data?: Array<{
    id: number;
    key: string;
    value: any;
    display_key?: string;
    display_value?: string;
  }>;
}

export interface Order {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  currency: string;
  date_created: string;
  date_modified: string;
  date_paid?: string;
  date_completed?: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  customer_note: string;
  billing: BillingAddress;
  shipping: ShippingAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  line_items: OrderItem[];
  tax_lines: any[];
  shipping_lines: any[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  customer: Customer;
  meta_data?: Array<{
    id: number;
    key: string;
    value: any;
    display_key?: string;
    display_value?: string;
  }>;
  _links?: {
    self?: Array<{ href: string }>;
    collection?: Array<{ href: string }>;
    customer?: Array<{ href: string }>;
    [key: string]: Array<{ href: string }> | undefined;
  };
  invoice_url?: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  totalPages: number;
}

export type OrderStatus = Order['status'];

export interface FilterOptions {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Additional utility types for better type safety
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ShopConnectionTest {
  isValid: boolean;
  message: string;
  details?: {
    url: boolean;
    key: boolean;
    secret: boolean;
  };
}

export interface OrderUpdateRequest {
  orderId: number;
  status: OrderStatus;
  note?: string;
}

export interface ShopFormData {
  name: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  isActive: boolean;
}
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatusBadge } from './OrderStatusBadge';
import { 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Calendar,
  Mail,
  Phone,
  Copy,
  Edit,
  Save,
  X,
  Building,
  Download,
  FileText,
  Printer,
  RefreshCw
} from 'lucide-react';
import { Order, OrderStatus, Shop } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { downloadInvoice } from './InvoiceGenerator';
import { downloadInvoicePDF, printInvoicePDF } from './InvoicePDF';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { getStoreCurrency } from '@/lib/currency';
import { getTranslatedStatus } from '@/lib/translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrderDetailsDrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate?: (orderId: number, status: OrderStatus) => void;
  shop?: Shop;
}

export function OrderDetailsDrawer({ 
  order, 
  open, 
  onClose, 
  onStatusUpdate,
  shop 
}: OrderDetailsDrawerProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const { storeInfo } = useStoreInfo(shop || null);
  const updateOrderStatus = useUpdateOrderStatus(shop || null);

  if (!order) return null;

  const formatCurrency = (amount: string) => {
    const currency = getStoreCurrency(shop);
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleStatusUpdate = async () => {
    if (newStatus && shop) {
      try {
        await updateOrderStatus.mutateAsync({ 
          orderId: order.id, 
          status: newStatus 
        });
        toast.success(`Order status updated to ${newStatus}`);
        setIsEditingStatus(false);
        setNewStatus('');
        // Call the original callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(order.id, newStatus);
        }
      } catch (error) {
        toast.error('Failed to update order status');
      }
    }
  };

  const handleDownloadInvoice = (format: 'html' | 'pdf') => {
    // Use store info from WooCommerce if available, otherwise fallback to shop data
    const invoiceShopInfo = storeInfo ? {
      shopName: storeInfo.store_name || shop?.name || '',
      shopAddress: storeInfo.store_address ? 
        `${storeInfo.store_address}${storeInfo.store_city ? ', ' + storeInfo.store_city : ''}${storeInfo.store_postcode ? ' ' + storeInfo.store_postcode : ''}${storeInfo.store_country ? ', ' + storeInfo.store_country : ''}` : 
        shop?.baseUrl || '',
      shopEmail: storeInfo.store_email || (shop ? `support@${new URL(shop.baseUrl).hostname}` : ''),
      shopPhone: ''
    } : shop ? {
      shopName: shop.name,
      shopAddress: shop.baseUrl,
      shopEmail: `support@${new URL(shop.baseUrl).hostname}`,
      shopPhone: ''
    } : undefined;

    if (format === 'pdf') {
      // For PDF, pass the shop with storeInfo
      const shopWithInfo = shop && storeInfo ? { ...shop, storeInfo } : shop;
      const downloadPromise = downloadInvoicePDF(order, shopWithInfo);
      toast.promise(downloadPromise, {
        loading: 'Generating PDF invoice...',
        success: `Invoice for order #${order.number} downloaded as PDF`,
        error: 'Failed to download PDF invoice'
      });
    } else {
      try {
        downloadInvoice(order, invoiceShopInfo);
        toast.success(`Invoice for order #${order.number} downloaded as HTML`);
      } catch (error) {
        console.error('Error downloading invoice:', error);
        toast.error('Failed to download invoice');
      }
    }
  };

  const handlePrintInvoice = async () => {
    try {
      // For print, pass the shop with storeInfo
      const shopWithInfo = shop && storeInfo ? { ...shop, storeInfo } : shop;
      await printInvoicePDF(order, shopWithInfo);
      toast.success(`Opening print dialog for order #${order.number}`);
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const orderItems = order.line_items || [];
  const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto bg-white">
        <SheetHeader className="space-y-4 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold text-gray-900">Order #{order.number}</SheetTitle>
              <SheetDescription className="text-gray-600">
                Created on {format(new Date(order.date_created), 'MMMM dd, yyyy at HH:mm')}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2 -mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEditingStatus ? (
                <div className="flex items-center gap-2">
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                    <SelectTrigger className="w-40 border-gray-200">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{getTranslatedStatus('pending')}</SelectItem>
                      <SelectItem value="processing">{getTranslatedStatus('processing')}</SelectItem>
                      <SelectItem value="on-hold">{getTranslatedStatus('on-hold')}</SelectItem>
                      <SelectItem value="completed">{getTranslatedStatus('completed')}</SelectItem>
                      <SelectItem value="cancelled">{getTranslatedStatus('cancelled')}</SelectItem>
                      <SelectItem value="refunded">{getTranslatedStatus('refunded')}</SelectItem>
                      <SelectItem value="failed">{getTranslatedStatus('failed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={handleStatusUpdate} 
                    disabled={!newStatus || updateOrderStatus.isPending} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateOrderStatus.isPending ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingStatus(false)} className="border-gray-200">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  {onStatusUpdate && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setIsEditingStatus(true);
                        setNewStatus(order.status);
                      }}
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleDownloadInvoice('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadInvoice('html')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download as HTML
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={handlePrintInvoice}
              className="gap-2 border-gray-200 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(`Order #${order.number} - ${formatCurrency(order.total)}`)}
              className="gap-2 border-gray-200 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
              Copy Details
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white">Overview</TabsTrigger>
              <TabsTrigger value="customer" className="data-[state=active]:bg-white">Customer</TabsTrigger>
              <TabsTrigger value="payment" className="data-[state=active]:bg-white">Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Order Items */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="h-5 w-5 text-blue-600" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderItems.map((item) => {
                    // Format metadata for better display
                    const formatMetaValue = (key: string, value: any): string => {
                      // Convert to string first
                      let strValue = String(value);
                      
                      // Handle HTML entities - do this first
                      if (strValue.includes('&#')) {
                        strValue = strValue
                          .replace(/&#8364;/g, '€')
                          .replace(/&#36;/g, '$')
                          .replace(/&#163;/g, '£')
                          .replace(/&#8482;/g, '™')
                          .replace(/&#174;/g, '®')
                          .replace(/&#169;/g, '©')
                          .replace(/&amp;/g, '&');
                      }
                      
                      // Clean up values
                      const lowerKey = key.toLowerCase();
                      
                      // Handle "Total:" prefix
                      if (lowerKey === 'total' && strValue.includes(':')) {
                        strValue = strValue.replace('Total:', '').trim();
                      }
                      
                      // Handle package/view count like "1.000 (2,99 €)"
                      if (lowerKey.includes('anzahl') || lowerKey.includes('views')) {
                        // Extract just the number if it has price in parentheses
                        const match = strValue.match(/^([\d.,]+)\s*\(/);
                        if (match) {
                          return match[1];
                        }
                      }
                      
                      // Handle specific patterns like "Views + Reichweite + Impressionen"
                      if (lowerKey === 'option' || lowerKey === 'option:') {
                        return strValue; // Keep as is, it's already clean
                      }
                      
                      // Handle URLs
                      if (strValue.startsWith('http://') || strValue.startsWith('https://')) {
                        return strValue;
                      }
                      
                      if (typeof value === 'boolean') {
                        return value ? 'Yes' : 'No';
                      }
                      if (value === 'checked') return '✓';
                      if (value === null || value === undefined || value === '') return '-';
                      
                      return strValue;
                    };

                    const formatMetaKey = (key: string): string => {
                      // Remove trailing :: from keys and normalize
                      const cleanKey = key
                        .replace(/::$/, '')
                        .toLowerCase()
                        .trim();
                      
                      // Special handling for known keys (try multiple variations)
                      const keyMap: { [key: string]: string } = {
                        'option': 'Package',
                        'option:': 'Package',
                        'anzahl der views': 'View Count',
                        'anzahl der views:': 'View Count',
                        'anzahl der follower': 'Follower Count',
                        'anzahl der follower:': 'Follower Count',
                        'ig video urls': 'Instagram URL',
                        'ig video urls: (verteilung auf bis zu 5 videos möglich)': 'Instagram URL',
                        'total': 'Package Total',
                        'total:': 'Package Total',
                      };
                      
                      // Check if we have a mapping
                      if (keyMap[cleanKey]) {
                        return keyMap[cleanKey];
                      }
                      
                      // Convert snake_case or camelCase to Title Case
                      return key
                        .replace(/::$/, '')
                        .replace(/:/g, '')
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                        .replace(/\s+/g, ' ');
                    };

                    return (
                      <div key={item.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            {(() => {
                              // Try to find image in different possible locations
                              let imageUrl = null;
                              
                              // Check if image is an object with src property
                              if (item.image) {
                                if (typeof item.image === 'string') {
                                  imageUrl = item.image;
                                } else if (item.image.src) {
                                  imageUrl = item.image.src;
                                }
                              }
                              
                              // Check if image might be in meta_data
                              if (!imageUrl && item.meta_data) {
                                const imageMeta = item.meta_data.find(meta => 
                                  meta.key.toLowerCase().includes('image') || 
                                  meta.key.toLowerCase().includes('thumbnail')
                                );
                                if (imageMeta?.value) {
                                  imageUrl = imageMeta.value;
                                }
                              }
                              
                              return imageUrl ? (
                                <>
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling;
                                      if (fallback) fallback.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 hidden">
                                    <Package className="h-8 w-8 text-gray-400" />
                                  </div>
                                </>
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-8 w-8 text-gray-400" />
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base">{item.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="text-gray-500">Qty:</span> {item.quantity} × {formatCurrency(item.price)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900 text-lg">{formatCurrency(item.total)}</p>
                              </div>
                            </div>
                            
                            {/* Display metadata if available */}
                            {item.meta_data && item.meta_data.length > 0 && (
                              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <tbody>
                                      {/* Sort fields: regular fields first, then technical fields */}
                                      {[...item.meta_data]
                                        .sort((a, b) => {
                                          const aIsTechnical = a.key.startsWith('_');
                                          const bIsTechnical = b.key.startsWith('_');
                                          if (aIsTechnical && !bIsTechnical) return 1;
                                          if (!aIsTechnical && bIsTechnical) return -1;
                                          return 0;
                                        })
                                        .map((meta, index) => {
                                        const isTechnical = meta.key.startsWith('_');
                                        const formattedKey = isTechnical ? meta.key : formatMetaKey(meta.key);
                                        const formattedValue = formatMetaValue(meta.key, meta.value);
                                        const isUrl = typeof formattedValue === 'string' && 
                                                     (formattedValue.startsWith('http://') || formattedValue.startsWith('https://'));
                                        
                                        return (
                                          <tr key={meta.id} className={`${index !== 0 ? 'border-t border-gray-200' : ''}`}>
                                            <td className={`py-3 pr-6 text-sm align-top ${isTechnical ? 'font-mono text-gray-500' : 'font-medium text-gray-700'}`} style={{ width: '40%' }}>
                                              {formattedKey}
                                            </td>
                                            <td className="py-3 text-sm">
                                              {isUrl ? (
                                                <a 
                                                  href={formattedValue} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-700 underline break-all"
                                                >
                                                  {formattedValue}
                                                </a>
                                              ) : (
                                                <span className={`break-words ${isTechnical ? 'font-mono text-gray-500' : 'text-gray-800'}`}>
                                                  {formattedValue}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Separator className="bg-gray-200" />

                  {/* Order Totals */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(subtotal.toString())}</span>
                    </div>
                    {parseFloat(order.shipping_total) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(order.shipping_total)}</span>
                      </div>
                    )}
                    {parseFloat(order.total_tax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(order.total_tax)}</span>
                      </div>
                    )}
                    {parseFloat(order.discount_total) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-{formatCurrency(order.discount_total)}</span>
                      </div>
                    )}
                    <Separator className="bg-gray-200" />
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Note */}
              {order.customer_note && (
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-gray-900">Customer Note</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">{order.customer_note}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="customer" className="space-y-6 mt-6">
              {/* Customer Info */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <User className="h-5 w-5 text-blue-600" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Name</label>
                      <p className="text-sm font-medium text-gray-900">{order.customer.first_name} {order.customer.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Username</label>
                      <p className="text-sm font-medium text-gray-900">{order.customer.username}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Email</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{order.customer.email}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(order.customer.email)}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.billing.first_name} {order.billing.last_name}
                  </p>
                  {order.billing.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-700">{order.billing.company}</p>
                    </div>
                  )}
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{order.billing.address_1}</p>
                    {order.billing.address_2 && <p>{order.billing.address_2}</p>}
                    <p>{order.billing.city}, {order.billing.state} {order.billing.postcode}</p>
                    <p className="font-medium">{order.billing.country}</p>
                  </div>
                  
                  <div className="pt-3 space-y-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{order.billing.email}</span>
                    </div>
                    {order.billing.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{order.billing.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="h-5 w-5 text-blue-600" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.shipping.first_name} {order.shipping.last_name}
                  </p>
                  {order.shipping.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-700">{order.shipping.company}</p>
                    </div>
                  )}
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{order.shipping.address_1}</p>
                    {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                    <p>{order.shipping.city}, {order.shipping.state} {order.shipping.postcode}</p>
                    <p className="font-medium">{order.shipping.country}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6 mt-6">
              {/* Payment Information */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Method</label>
                      <p className="text-sm font-medium text-gray-900">{order.payment_method_title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Status</label>
                      <div className="mt-1">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                  
                  {order.transaction_id && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Transaction ID</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded border">{order.transaction_id}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(order.transaction_id)}
                          className="h-6 w-6 p-0 hover:bg-gray-100"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Currency</label>
                      <p className="text-sm font-medium text-gray-900">{order.currency}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Total</label>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Actions */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Invoice & Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 w-full">
                          <Download className="h-4 w-4" />
                          Download Invoice
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleDownloadInvoice('pdf')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadInvoice('html')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download as HTML
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      onClick={handlePrintInvoice}
                      className="gap-2 border-gray-200 hover:bg-gray-50 w-full"
                    >
                      <Printer className="h-4 w-4" />
                      Print Invoice
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Invoice will include all order details, customer information, and payment summary.
                  </p>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Order Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Order Created</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(order.date_created), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {order.date_modified !== order.date_created && (
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Last Updated</p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(order.date_modified), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
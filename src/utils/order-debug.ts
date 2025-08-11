import { Order } from '@/types';

interface StoreOrderData {
  storeName: string;
  storeId: string;
  timestamp: string;
  apiResponse: {
    orders: any[];
    total: number;
    totalPages: number;
  };
  transformedOrders: Order[];
}

interface ComparisonResult {
  storeName: string;
  storeId: string;
  apiOrderCount: number;
  displayedOrderCount: number;
  missingOrders: any[];
  extraOrders: any[];
  differences: {
    orderId: number;
    field: string;
    apiValue: any;
    displayValue: any;
  }[];
}

export class OrderDebugger {
  private storeData: Map<string, StoreOrderData> = new Map();
  private displayedOrders: (Order & { shopName?: string; shopId?: string })[] = [];

  // Save raw API response for a store
  saveStoreApiResponse(
    storeId: string,
    storeName: string,
    apiResponse: any,
    transformedOrders: Order[]
  ) {
    const data: StoreOrderData = {
      storeName,
      storeId,
      timestamp: new Date().toISOString(),
      apiResponse,
      transformedOrders
    };
    
    this.storeData.set(storeId, data);
    
    // Also save to localStorage for persistence
    const existingData = localStorage.getItem('debug_orders') || '{}';
    const debugData = JSON.parse(existingData);
    debugData[storeId] = data;
    localStorage.setItem('debug_orders', JSON.stringify(debugData));
  }

  // Save what's currently displayed in the UI
  saveDisplayedOrders(orders: (Order & { shopName?: string; shopId?: string })[]) {
    this.displayedOrders = [...orders];
    localStorage.setItem('debug_displayed_orders', JSON.stringify(orders));
  }

  // Export all data to JSON files
  exportToFiles() {
    const exports: any[] = [];
    
    // Export each store's data
    this.storeData.forEach((data, storeId) => {
      const filename = `store_${data.storeName.replace(/\s+/g, '_')}_orders.json`;
      const content = {
        storeInfo: {
          id: storeId,
          name: data.storeName,
          timestamp: data.timestamp
        },
        apiResponse: {
          totalOrders: data.apiResponse.total,
          totalPages: data.apiResponse.totalPages,
          ordersInResponse: data.apiResponse.orders.length,
          orders: data.apiResponse.orders
        },
        transformedOrders: data.transformedOrders
      };
      
      this.downloadJson(content, filename);
      exports.push({ filename, data: content });
    });
    
    // Export displayed orders
    if (this.displayedOrders.length > 0) {
      const displayedContent = {
        timestamp: new Date().toISOString(),
        totalDisplayed: this.displayedOrders.length,
        ordersByStore: this.groupOrdersByStore(this.displayedOrders),
        allOrders: this.displayedOrders
      };
      
      this.downloadJson(displayedContent, 'displayed_orders.json');
      exports.push({ filename: 'displayed_orders.json', data: displayedContent });
    }
    
    // Export comparison report
    const comparison = this.compareAllStores();
    this.downloadJson(comparison, 'comparison_report.json');
    
    return exports;
  }

  // Compare API responses with displayed orders
  compareAllStores(): ComparisonResult[] {
    const results: ComparisonResult[] = [];
    
    this.storeData.forEach((storeData, storeId) => {
      const displayedForStore = this.displayedOrders.filter(
        order => order.shopId === storeId
      );
      
      const apiOrderIds = new Set(storeData.apiResponse.orders.map(o => o.id));
      const displayedOrderIds = new Set(displayedForStore.map(o => o.id));
      
      // Find missing orders (in API but not displayed)
      const missingOrders = storeData.apiResponse.orders.filter(
        order => !displayedOrderIds.has(order.id)
      );
      
      // Find extra orders (displayed but not in API response)
      const extraOrders = displayedForStore.filter(
        order => !apiOrderIds.has(order.id)
      );
      
      // Find field differences for matching orders
      const differences: any[] = [];
      displayedForStore.forEach(displayedOrder => {
        const apiOrder = storeData.apiResponse.orders.find(
          o => o.id === displayedOrder.id
        );
        
        if (apiOrder) {
          // Compare key fields
          const fieldsToCompare = ['total', 'status', 'customer', 'date_created'];
          fieldsToCompare.forEach(field => {
            const apiValue = this.getNestedValue(apiOrder, field);
            const displayValue = this.getNestedValue(displayedOrder, field);
            
            if (JSON.stringify(apiValue) !== JSON.stringify(displayValue)) {
              differences.push({
                orderId: displayedOrder.id,
                field,
                apiValue,
                displayValue
              });
            }
          });
        }
      });
      
      results.push({
        storeName: storeData.storeName,
        storeId: storeData.storeId,
        apiOrderCount: storeData.apiResponse.orders.length,
        displayedOrderCount: displayedForStore.length,
        missingOrders,
        extraOrders,
        differences
      });
    });
    
    return results;
  }

  // Generate a summary report
  generateSummaryReport(): string {
    const comparison = this.compareAllStores();
    let report = '=== ORDER COMPARISON REPORT ===\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    let totalApiOrders = 0;
    let totalDisplayedOrders = 0;
    let totalMissing = 0;
    let totalExtra = 0;
    
    comparison.forEach(result => {
      report += `\n--- ${result.storeName} (${result.storeId}) ---\n`;
      report += `API Orders: ${result.apiOrderCount}\n`;
      report += `Displayed Orders: ${result.displayedOrderCount}\n`;
      report += `Missing Orders: ${result.missingOrders.length}\n`;
      report += `Extra Orders: ${result.extraOrders.length}\n`;
      report += `Field Differences: ${result.differences.length}\n`;
      
      totalApiOrders += result.apiOrderCount;
      totalDisplayedOrders += result.displayedOrderCount;
      totalMissing += result.missingOrders.length;
      totalExtra += result.extraOrders.length;
      
      if (result.missingOrders.length > 0) {
        report += '\nMissing Order IDs:\n';
        result.missingOrders.forEach(order => {
          report += `  - #${order.number} (ID: ${order.id}) - ${order.status}\n`;
        });
      }
      
      if (result.extraOrders.length > 0) {
        report += '\nExtra Order IDs:\n';
        result.extraOrders.forEach(order => {
          report += `  - #${order.number} (ID: ${order.id}) - ${order.status}\n`;
        });
      }
    });
    
    report += `\n\n=== SUMMARY ===\n`;
    report += `Total API Orders: ${totalApiOrders}\n`;
    report += `Total Displayed Orders: ${totalDisplayedOrders}\n`;
    report += `Total Missing: ${totalMissing}\n`;
    report += `Total Extra: ${totalExtra}\n`;
    report += `\nStatus: ${totalMissing === 0 && totalExtra === 0 ? '✅ ALL ORDERS ACCOUNTED FOR' : '⚠️ DISCREPANCIES FOUND'}\n`;
    
    return report;
  }

  // Helper methods
  private groupOrdersByStore(orders: any[]) {
    const grouped: Record<string, any[]> = {};
    orders.forEach(order => {
      const key = order.shopId || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });
    return grouped;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  private downloadJson(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Load saved data from localStorage
  loadFromStorage() {
    const debugData = localStorage.getItem('debug_orders');
    const displayedData = localStorage.getItem('debug_displayed_orders');
    
    if (debugData) {
      const parsed = JSON.parse(debugData);
      Object.entries(parsed).forEach(([storeId, data]) => {
        this.storeData.set(storeId, data as StoreOrderData);
      });
    }
    
    if (displayedData) {
      this.displayedOrders = JSON.parse(displayedData);
    }
  }

  // Clear all debug data
  clear() {
    this.storeData.clear();
    this.displayedOrders = [];
    localStorage.removeItem('debug_orders');
    localStorage.removeItem('debug_displayed_orders');
  }
}

// Singleton instance
export const orderDebugger = new OrderDebugger();
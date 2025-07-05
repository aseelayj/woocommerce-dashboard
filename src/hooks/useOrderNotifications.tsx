import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shop, Order } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { ShoppingCart, DollarSign, Package } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationSettings {
  enabled: boolean;
  pollInterval: number; // in seconds
  soundEnabled: boolean;
  showOrderDetails: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  pollInterval: 15, // 15 seconds - faster notifications
  soundEnabled: true,
  showOrderDetails: true,
};

// Store the last seen order IDs per shop
const lastSeenOrders = new Map<string, Set<number>>();

// Load last seen orders from localStorage on initialization
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('lastSeenOrders');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([shopId, orderIds]) => {
        lastSeenOrders.set(shopId, new Set(orderIds as number[]));
      });
    } catch (e) {
      console.error('Failed to parse lastSeenOrders from localStorage:', e);
    }
  }
}

// Helper function to persist lastSeenOrders to localStorage
const persistLastSeenOrders = () => {
  const toStore: Record<string, number[]> = {};
  lastSeenOrders.forEach((orderIds, shopId) => {
    toStore[shopId] = Array.from(orderIds);
  });
  localStorage.setItem('lastSeenOrders', JSON.stringify(toStore));
};

export function useOrderNotifications(
  shops: Shop[],
  settings: Partial<NotificationSettings> = {}
) {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  
  const config = { ...DEFAULT_SETTINGS, ...settings };

  // Initialize notification sound
  useEffect(() => {
    if (config.soundEnabled) {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      // Create a simple beep sound
      const playNotificationSound = () => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.1);
      };
      
      notificationSound.current = {
        play: playNotificationSound
      } as any;
    }
  }, [config.soundEnabled]);


  const queries = useQuery({
    queryKey: ['orderNotifications', 'all', shops.map(s => s.id)],
    queryFn: async () => {
      const activeShops = shops.filter(shop => shop.isActive);
      const results = await Promise.allSettled(
        activeShops.map(async shop => {
          const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
          const response = await api.getOrders(
            {},
            { 
              page: 1, 
              limit: 10,
              sortBy: 'date_created',
              sortOrder: 'desc'
            }
          );
          return { shop, orders: response.orders };
        })
      );
      
      return results
        .filter((result): result is PromiseFulfilledResult<{ shop: Shop; orders: Order[] }> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    },
    enabled: config.enabled && shops.some(s => s.isActive),
    refetchInterval: config.pollInterval * 1000,
    refetchIntervalInBackground: true,
    staleTime: (config.pollInterval - 5) * 1000,
  });

  // Process new orders and show notifications
  useEffect(() => {
    if (!queries.data || isFirstLoad) {
      // On first load, just store the order IDs without showing notifications
      if (queries.data && isFirstLoad) {
        queries.data.forEach(({ shop, orders }) => {
          const orderIds = new Set(orders.map(order => order.id));
          lastSeenOrders.set(shop.id, orderIds);
        });
        persistLastSeenOrders(); // Persist initial state
        setIsFirstLoad(false);
      }
      return;
    }

    // Check for new orders
    queries.data.forEach(({ shop, orders }) => {
      const shopLastSeen = lastSeenOrders.get(shop.id) || new Set();
      const currentOrderIds = new Set(orders.map(order => order.id));
      
      // Find new orders
      const newOrders = orders.filter(order => !shopLastSeen.has(order.id));
      
      // Show notifications for new orders
      newOrders.forEach(order => {
        showOrderNotification(order, shop);
      });
      
      // Update last seen orders
      if (newOrders.length > 0) {
        lastSeenOrders.set(shop.id, currentOrderIds);
        persistLastSeenOrders(); // Persist to localStorage
        
        // Play sound once for all new orders
        if (config.soundEnabled && notificationSound.current) {
          notificationSound.current.play();
        }
      }
    });
  }, [queries.data, isFirstLoad, config.soundEnabled]);

  const showOrderNotification = (order: Order, shop: Shop) => {
    const formatCurrency = (amount: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: order.currency || 'USD',
      }).format(parseFloat(amount));
    };

    const orderTime = format(new Date(order.date_created), 'h:mm a');
    
    if (config.showOrderDetails) {
      // Detailed notification
      toast(
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">
              New Order #{order.number}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {shop.name} • {orderTime}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(order.total)}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {order.line_items?.length || 0} items
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {order.billing.first_name} {order.billing.last_name}
            </p>
          </div>
        </div>,
        {
          duration: 6000,
          action: {
            label: 'View',
            onClick: () => {
              // Navigate to orders view with this order selected
              window.dispatchEvent(
                new CustomEvent('navigate-to-order', { 
                  detail: { shop, order } 
                })
              );
            },
          },
        }
      );
    } else {
      // Simple notification
      toast.success(
        `New order #${order.number} received at ${shop.name}`,
        {
          description: `${formatCurrency(order.total)} • ${orderTime}`,
          duration: 5000,
        }
      );
    }
  };

  const clearNotificationHistory = () => {
    lastSeenOrders.clear();
    localStorage.removeItem('lastSeenOrders');
    setIsFirstLoad(true);
  };

  return {
    isPolling: queries.isRefetching,
    clearHistory: clearNotificationHistory,
    refetch: queries.refetch,
  };
}

// Hook to manage notification settings
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('orderNotificationSettings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('orderNotificationSettings', JSON.stringify(updated));
  };

  return { settings, updateSettings };
}
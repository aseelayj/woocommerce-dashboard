import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Store, 
  ShoppingCart, 
  Plus, 
  Settings, 
  BarChart3,
  Edit,
  X
} from 'lucide-react';
import { Shop } from '@/types';

type ActiveView = 'dashboard' | 'orders' | 'settings';

interface SidebarProps {
  shops: Shop[];
  activeShop: Shop | null;
  activeView: ActiveView;
  onShopSelect: (shop: Shop) => void;
  onViewChange: (view: ActiveView) => void;
  onAddShop: () => void;
  onEditShop: (shop: Shop) => void;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ 
  shops, 
  activeShop, 
  activeView,
  onShopSelect, 
  onViewChange,
  onAddShop, 
  onEditShop,
  onClose,
  className 
}: SidebarProps) {
  const menuItems = [
    { 
      id: 'dashboard' as ActiveView, 
      icon: BarChart3, 
      label: 'Dashboard' 
    },
    { 
      id: 'orders' as ActiveView, 
      icon: ShoppingCart, 
      label: 'Orders' 
    },
    { 
      id: 'settings' as ActiveView, 
      icon: Settings, 
      label: 'Settings' 
    },
  ];

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl text-gray-900">WooCommerce</h1>
              <p className="text-xs md:text-sm text-gray-500">Order Management</p>
            </div>
          </div>
          {/* Close button for mobile */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Active Shop */}
        {activeShop && (
          <div className="p-3 md:p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900 truncate">{activeShop.name}</p>
                <p className="text-xs text-gray-600 truncate">
                  {new URL(activeShop.baseUrl).hostname}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge 
                  variant={activeShop.isActive ? 'default' : 'secondary'} 
                  className={cn(
                    'text-xs',
                    activeShop.isActive 
                      ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  )}
                >
                  {activeShop.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditShop(activeShop)}
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col">
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeView === item.id ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-10 md:h-11',
                  activeView === item.id
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                size="sm"
                onClick={() => onViewChange(item.id)}
              >
                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>

        <Separator className="bg-gray-100" />

        {/* Shops Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs md:text-sm text-gray-900 uppercase tracking-wide">
              Connected Shops
            </h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onAddShop} 
              className="h-6 w-6 md:h-7 md:w-7 p-0 border-gray-200 hover:bg-gray-50"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
          
          <ScrollArea className="max-h-48 md:max-h-64">
            <div className="space-y-2">
              {shops.map((shop) => (
                <Button
                  key={shop.id}
                  variant={activeShop?.id === shop.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start text-left h-auto p-2 md:p-3 transition-all',
                    activeShop?.id === shop.id 
                      ? 'bg-blue-50 border border-blue-200 hover:bg-blue-50' 
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                  onClick={() => onShopSelect(shop)}
                >
                  <div className="flex items-center gap-2 md:gap-3 w-full">
                    <div className={cn(
                      'w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0',
                      shop.isActive ? 'bg-green-500' : 'bg-gray-300'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium truncate text-gray-900">{shop.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {new URL(shop.baseUrl).hostname}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
              
              {shops.length === 0 && (
                <div className="text-center py-4 md:py-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Store className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mb-3">No shops connected</p>
                  <Button 
                    size="sm" 
                    onClick={onAddShop}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm"
                  >
                    Add First Shop
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
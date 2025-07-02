import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Settings, 
  User,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shop } from '@/types';

type ActiveView = 'dashboard' | 'orders' | 'settings';

interface HeaderProps {
  activeShop: Shop | null;
  activeView: ActiveView;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ activeShop, activeView, onRefresh, isLoading }: HeaderProps) {
  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard';
      case 'orders':
        return 'Orders Management';
      case 'settings':
        return 'Settings';
      default:
        return 'WooCommerce Dashboard';
    }
  };

  const getPageDescription = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Overview of your store performance and key metrics';
      case 'orders':
        return 'Track and manage your WooCommerce orders';
      case 'settings':
        return 'Configure your shops and application settings';
      default:
        return '';
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Page Title */}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-sm text-gray-500">{getPageDescription()}</p>
        </div>

        {/* Search - Only show on orders page */}
        {activeView === 'orders' && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search orders, customers..."
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          {(activeView === 'orders' || activeView === 'dashboard') && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}

          {/* Shop Status */}
          {activeShop && (
            <Badge 
              variant={activeShop.isActive ? 'default' : 'secondary'}
              className={activeShop.isActive 
                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
              }
            >
              {activeShop.isActive ? 'Connected' : 'Disconnected'}
            </Badge>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-gray-100">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-gray-500">
                    admin@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600">
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
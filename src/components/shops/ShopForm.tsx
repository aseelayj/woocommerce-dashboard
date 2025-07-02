import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Shop } from '@/types';
import { shopAPI } from '@/lib/api-wrapper';
import { toast } from 'sonner';

interface ShopFormProps {
  shop?: Shop;
  open: boolean;
  onClose: () => void;
  onSave: (shop: Shop) => void;
}

export function ShopForm({ shop, open, onClose, onSave }: ShopFormProps) {
  const [formData, setFormData] = useState({
    name: shop?.name || '',
    baseUrl: shop?.baseUrl || '',
    consumerKey: shop?.consumerKey || '',
    consumerSecret: shop?.consumerSecret || '',
    isActive: shop?.isActive ?? true,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let savedShop: Shop;
      
      if (shop) {
        // Update existing shop
        savedShop = await shopAPI.updateShop(shop.id, formData) as Shop;
        toast.success('Shop updated successfully');
      } else {
        // Create new shop
        savedShop = await shopAPI.createShop(formData);
        toast.success('Shop added successfully');
      }
      
      onSave(savedShop);
      onClose();
    } catch (error) {
      toast.error('Failed to save shop');
      console.error('Error saving shop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!formData.baseUrl || !formData.consumerKey || !formData.consumerSecret) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('idle');

    try {
      const isConnected = await shopAPI.testConnection(formData);
      setConnectionStatus(isConnected ? 'success' : 'error');
      
      if (isConnected) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed. Please check your credentials.');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Connection test failed');
      console.error('Connection test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const formatUrl = (url: string) => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleUrlChange = (value: string) => {
    setFormData({ ...formData, baseUrl: formatUrl(value) });
    setConnectionStatus('idle');
  };

  const ConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">
            {shop ? 'Edit Shop' : 'Add New Shop'}
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base text-gray-600">
            {shop 
              ? 'Update your WooCommerce shop connection details.'
              : 'Connect a new WooCommerce shop to manage orders.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Shop Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My WooCommerce Store"
              className="border-gray-200 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-sm font-semibold text-gray-700">Store URL</Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://yourstore.com"
              className="border-gray-200 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500">
              Enter your WooCommerce store URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumerKey" className="text-sm font-semibold text-gray-700">Consumer Key</Label>
            <Input
              id="consumerKey"
              value={formData.consumerKey}
              onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
              placeholder="ck_..."
              className="border-gray-200 focus:border-blue-500 font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumerSecret" className="text-sm font-semibold text-gray-700">Consumer Secret</Label>
            <Input
              id="consumerSecret"
              type="password"
              value={formData.consumerSecret}
              onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
              placeholder="cs_..."
              className="border-gray-200 focus:border-blue-500 font-mono text-sm"
              required
            />
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Connection</Label>
          </div>

          {/* Connection Test */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
                <ConnectionStatusIcon />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {connectionStatus === 'success' && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                      Connected
                    </Badge>
                  )}
                  {connectionStatus === 'error' && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                      Failed
                    </Badge>
                  )}
                  {connectionStatus === 'idle' && (
                    <Badge variant="outline" className="border-gray-200">
                      Not Tested
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={isTesting}
                  className="border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-xs text-gray-600 space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p>
              <strong className="text-gray-900">Need help?</strong> Generate API keys in your WooCommerce admin:
            </p>
            <p className="font-mono text-xs">
              WooCommerce → Settings → Advanced → REST API → Add Key
            </p>
            {formData.baseUrl && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                onClick={() => window.open(`${formData.baseUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`, '_blank')}
              >
                Open API Keys Page
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="border-gray-200 hover:bg-gray-50 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {shop ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                shop ? 'Update Shop' : 'Add Shop'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
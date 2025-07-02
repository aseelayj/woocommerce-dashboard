import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shop } from '@/types';
import { 
  Store, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Key,
  Link,
  Shield,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { shopAPI } from '@/lib/api-wrapper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettingsProps {
  shops: Shop[];
  activeShop: Shop | null;
  onAddShop: () => void;
  onEditShop: (shop: Shop) => void;
  onShopUpdate: (shops: Shop[]) => void;
}

export function Settings({ shops, activeShop, onAddShop, onEditShop, onShopUpdate }: SettingsProps) {
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const handleDeleteShop = async (shop: Shop) => {
    try {
      const success = await shopAPI.deleteShop(shop.id);
      if (success) {
        toast.success(`${shop.name} has been deleted`);
        const updatedShops = shops.filter(s => s.id !== shop.id);
        onShopUpdate(updatedShops);
      } else {
        toast.error('Failed to delete shop');
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast.error('Failed to delete shop');
    } finally {
      setDeletingShop(null);
    }
  };

  const handleTestConnection = async (shop: Shop) => {
    setTestingConnection(shop.id);
    try {
      const isConnected = await shopAPI.testConnection({
        name: shop.name,
        baseUrl: shop.baseUrl,
        consumerKey: shop.consumerKey,
        consumerSecret: shop.consumerSecret,
        isActive: shop.isActive
      });
      
      if (isConnected) {
        toast.success(`Connection to ${shop.name} is working!`);
      } else {
        toast.error(`Connection to ${shop.name} failed`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error(`Connection test failed for ${shop.name}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleToggleActive = async (shop: Shop) => {
    try {
      const updatedShop = await shopAPI.updateShop(shop.id, {
        ...shop,
        isActive: !shop.isActive
      });
      
      if (updatedShop) {
        const updatedShops = shops.map(s => s.id === shop.id ? updatedShop : s);
        onShopUpdate(updatedShops);
        toast.success(`${shop.name} is now ${updatedShop.isActive ? 'active' : 'inactive'}`);
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      toast.error('Failed to update shop status');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your connected WooCommerce shops and preferences</p>
      </div>

      {/* Connected Shops */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Connected Shops</CardTitle>
              <CardDescription>Manage your WooCommerce store connections</CardDescription>
            </div>
            <Button
              onClick={onAddShop}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Shop
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {shops.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No shops connected yet</p>
                  <Button
                    onClick={onAddShop}
                    className="mt-4 gap-2"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                    Connect Your First Shop
                  </Button>
                </div>
              ) : (
                shops.map((shop) => (
                  <div
                    key={shop.id}
                    className={`p-4 rounded-lg border ${
                      activeShop?.id === shop.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Store className="h-5 w-5 text-gray-600" />
                          <h4 className="font-semibold text-gray-900">{shop.name}</h4>
                          {activeShop?.id === shop.id && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              Currently Active
                            </Badge>
                          )}
                          <Badge
                            variant={shop.isActive ? 'default' : 'secondary'}
                            className={
                              shop.isActive
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }
                          >
                            {shop.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Link className="h-3 w-3" />
                            <a
                              href={shop.baseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 flex items-center gap-1"
                            >
                              {new URL(shop.baseUrl).hostname}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Key className="h-3 w-3" />
                            <span className="font-mono text-xs">
                              {shop.consumerKey.substring(0, 10)}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Activity className="h-3 w-3" />
                            <span>Added {new Date(shop.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(shop)}
                          disabled={testingConnection === shop.id}
                          className="gap-2 border-gray-200"
                        >
                          {testingConnection === shop.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3" />
                              Test
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(shop)}
                          className="gap-2 border-gray-200"
                        >
                          {shop.isActive ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              Disable
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditShop(shop)}
                          className="gap-2 border-gray-200"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingShop(shop)}
                          className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* API Security Tips */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
            <Shield className="h-5 w-5 text-blue-600" />
            API Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Use Read-Only Permissions</p>
              <p className="text-sm text-gray-600">
                When creating API keys, grant only read permissions unless write access is absolutely necessary.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Enable SSL/HTTPS</p>
              <p className="text-sm text-gray-600">
                Ensure your WooCommerce store uses HTTPS to encrypt API communications.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Rotate Keys Regularly</p>
              <p className="text-sm text-gray-600">
                Periodically regenerate your API keys to maintain security.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Monitor API Usage</p>
              <p className="text-sm text-gray-600">
                Regularly check your WooCommerce API logs for any suspicious activity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingShop} onOpenChange={() => setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the connection to "{deletingShop?.name}"? 
              This action cannot be undone and you'll need to re-add the shop with API credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingShop && handleDeleteShop(deletingShop)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Shop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
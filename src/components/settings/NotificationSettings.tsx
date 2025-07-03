import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Volume2, Eye, Clock } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useOrderNotifications';

export function NotificationSettings() {
  const { settings, updateSettings } = useNotificationSettings();

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Order Notifications</CardTitle>
        </div>
        <CardDescription>
          Configure how you receive notifications for new orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-enabled" className="text-base">
              Enable Notifications
            </Label>
            <p className="text-sm text-gray-500">
              Receive toast notifications when new orders arrive
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>

        {/* Polling Interval */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <Label htmlFor="poll-interval">Check Frequency</Label>
          </div>
          <Select
            value={settings.pollInterval.toString()}
            onValueChange={(value) => updateSettings({ pollInterval: parseInt(value) })}
            disabled={!settings.enabled}
          >
            <SelectTrigger id="poll-interval" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">Every 15 seconds</SelectItem>
              <SelectItem value="30">Every 30 seconds</SelectItem>
              <SelectItem value="60">Every minute</SelectItem>
              <SelectItem value="120">Every 2 minutes</SelectItem>
              <SelectItem value="300">Every 5 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            How often to check for new orders across all active shops
          </p>
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-gray-500" />
              <Label htmlFor="sound-enabled" className="text-base">
                Sound Alerts
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              Play a notification sound when new orders arrive
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            disabled={!settings.enabled}
          />
        </div>

        {/* Detailed Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <Label htmlFor="show-details" className="text-base">
                Show Order Details
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              Display customer name, items, and total in notifications
            </p>
          </div>
          <Switch
            id="show-details"
            checked={settings.showOrderDetails}
            onCheckedChange={(checked) => updateSettings({ showOrderDetails: checked })}
            disabled={!settings.enabled}
          />
        </div>

        {/* Status Info */}
        {settings.enabled && (
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Notifications are active.</span> New orders will appear as toast notifications in the bottom right corner.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
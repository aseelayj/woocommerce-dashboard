import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return {
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
          label: 'Completed'
        };
      case 'processing':
        return {
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
          label: 'Processing'
        };
      case 'pending':
        return {
          className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
          label: 'Pending'
        };
      case 'on-hold':
        return {
          className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
          label: 'On Hold'
        };
      case 'failed':
        return {
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
          label: 'Failed'
        };
      case 'cancelled':
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
          label: 'Cancelled'
        };
      case 'refunded':
        return {
          className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
          label: 'Refunded'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
          label: (status as string).charAt(0).toUpperCase() + (status as string).slice(1).replace('-', ' ')
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-semibold text-xs px-2.5 py-1 border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
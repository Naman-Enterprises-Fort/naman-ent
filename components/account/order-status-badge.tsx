import type { OrderStatus } from '@prisma/client';

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending payment',
    className:
      'border-amber-600/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className:
      'border-emerald-600/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'border-sky-600/40 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  },
  SHIPPED: {
    label: 'Shipped',
    className: 'border-sky-600/40 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for delivery',
    className: 'border-sky-600/40 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  },
  DELIVERED: {
    label: 'Delivered',
    className:
      'border-emerald-600/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-muted bg-muted text-muted-foreground',
  },
  RETURN_REQUESTED: {
    label: 'Return requested',
    className: 'border-muted bg-muted text-muted-foreground',
  },
  RETURN_PICKED_UP: {
    label: 'Return picked up',
    className: 'border-muted bg-muted text-muted-foreground',
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'border-muted bg-muted text-muted-foreground',
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

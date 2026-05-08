import { CheckCircle2, Truck } from 'lucide-react';
import { formatINR, fromPaise } from '@/lib/money';
import { cn } from '@/lib/utils';

export function FreeShippingBar({
  thresholdPaise,
  remainingPaise,
}: {
  thresholdPaise: number;
  remainingPaise: number;
}) {
  const earned = remainingPaise <= 0;
  const pct = earned
    ? 100
    : Math.max(
        4,
        Math.min(100, Math.round(((thresholdPaise - remainingPaise) / thresholdPaise) * 100)),
      );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3 text-sm',
        earned
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
          : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
      )}
    >
      <div className="flex items-center gap-2">
        {earned ? (
          <CheckCircle2 aria-hidden className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Truck aria-hidden className="size-4 text-muted-foreground" />
        )}
        <span className="font-medium">
          {earned ? (
            'You qualify for free shipping'
          ) : (
            <>Add {formatINR(fromPaise(remainingPaise))} more for free shipping</>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            earned ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-foreground',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

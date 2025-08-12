// components/ui/progress.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

function clampPercent(value: number | undefined, max: number | undefined): number {
  const safeMax = typeof max === 'number' && isFinite(max) && max > 0 ? max : 100;
  const raw = typeof value === 'number' && isFinite(value) ? value : 0;
  const percent = (raw / safeMax) * 100;
  if (percent < 0) return 0;
  if (percent > 100) return 100;
  return percent;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percent = clampPercent(value, max);
    return (
      <div
        ref={ref}
        className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };

// --- In ClientDashboardTab.tsx ---
// When using Progress, always ensure value is numeric:
// <Progress value={Number(progressBar3Month)} className={`w-full h-2 ${getProgressColorClass(progressBar3Month)}`} />

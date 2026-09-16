import * as React from 'react';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { cn } from '@renderer/lib/utils';

export type EditorSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * EditorSkeleton (DESIGN.md §5.5, Architecture §17).
 * Tampilan skeleton transisi saat beralih catatan aktif,
 * mencegah glitch / kedipan Empty State saat fetching data IPC.
 */
export const EditorSkeleton: React.FC<EditorSkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      data-testid="editor-skeleton"
      className={cn(
        'flex flex-col h-full w-full overflow-hidden bg-background select-none',
        className,
      )}
      {...props}
    >
      {/* Skeleton Sticky Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-10 px-6 border-b border-border/70 bg-background/95 shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="w-24 h-3.5" />
        </div>
        <Skeleton className="w-28 h-6 rounded-md" />
      </header>

      {/* Skeleton Content Area (Centered Canvas Max-width 740px) */}
      <div className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-8">
        <div className="w-full max-w-[740px] mx-auto space-y-6 pt-2">
          {/* Note Title / Header Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/5 rounded" />
          </div>

          {/* Paragraph Lines Skeletons */}
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[78%]" />
          </div>

          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
    </div>
  );
};

import * as React from 'react';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { cn } from '@renderer/lib/utils';

export type SidebarSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * SidebarSkeleton (DESIGN.md §5.5, Architecture §17).
 * Placeholder loading state untuk daftar catatan di sidebar saat aplikasi pertama kali dibuka,
 * mengeliminasi visual glitch kedipan "Belum ada catatan" (Empty State) selagi query IPC berlangsung.
 */
export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      data-testid="sidebar-skeleton"
      className={cn('flex flex-col space-y-3 px-2 py-1 select-none animate-pulse', className)}
      {...props}
    >
      {/* Section Header Placeholder */}
      <div className="pt-1 pb-0.5">
        <Skeleton className="h-3 w-16 rounded" />
      </div>

      {/* Note Item Skeleton Placeholders */}
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-1.5 p-2 rounded-md border border-border/40 bg-card/40"
        >
          {/* Note Title */}
          <Skeleton className={cn('h-3.5 rounded', index % 2 === 0 ? 'w-3/4' : 'w-2/3')} />

          {/* Note Metadata / Snippet */}
          <div className="flex items-center gap-2 pt-0.5">
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className={cn('h-2.5 rounded', index % 2 === 0 ? 'w-1/2' : 'w-2/5')} />
          </div>
        </div>
      ))}
    </div>
  );
};

SidebarSkeleton.displayName = 'SidebarSkeleton';

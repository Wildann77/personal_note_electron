import * as React from 'react';
import { cn } from '@renderer/lib/utils';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton (shadcn/ui primitive).
 * Digunakan sebagai indikator pemuatan (loading state) standar
 * saat data catatan sedang dimuat via IPC untuk mencegah visual glitch / UI flickering.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      data-testid="skeleton"
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  );
};

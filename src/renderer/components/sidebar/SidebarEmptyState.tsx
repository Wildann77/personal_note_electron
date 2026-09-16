import * as React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { useCreateNote } from './useCreateNote';

export interface SidebarEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  onCreateNote?: () => void;
}

/**
 * SidebarEmptyState (DESIGN.md §5.4, PRD US#1, US#20).
 * Tampilan kosong minimalis ketika belum ada catatan sama sekali.
 */
export const SidebarEmptyState: React.FC<SidebarEmptyStateProps> = ({
  onCreateNote,
  className,
  ...props
}) => {
  const handleCreate = useCreateNote(onCreateNote);

  return (
    <div
      data-testid="sidebar-empty-state"
      className={cn(
        'flex flex-col items-center justify-center h-full px-4 py-8 text-center select-none',
        className,
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 border border-border/50">
        <FileText className="w-6 h-6 opacity-75" />
      </div>
      <p className="text-xs font-semibold text-foreground tracking-tight mb-1">Belum ada catatan</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 max-w-[200px]">
        Mulai menulis ide dan catatan baru untuk hari ini.
      </p>
      <Button
        size="sm"
        data-testid="empty-state-create-button"
        aria-label="Catatan Baru"
        className="h-8 text-xs px-3 font-medium flex items-center gap-1.5 shadow-sm"
        onClick={handleCreate}
      >
        <Plus className="w-3.5 h-3.5" />
        Catatan Baru
      </Button>
    </div>
  );
};

SidebarEmptyState.displayName = 'SidebarEmptyState';

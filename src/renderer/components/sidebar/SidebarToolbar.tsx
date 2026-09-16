import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { useCreateNote } from './useCreateNote';

export interface SidebarToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onCreateNote?: () => void;
  showCreateButton?: boolean;
}

/**
 * SidebarToolbar (PRD US#2, US#20, DESIGN.md §4.1).
 * Toolbar di bagian atas sidebar catatan dengan aksi cepat membuat catatan baru.
 */
export const SidebarToolbar: React.FC<SidebarToolbarProps> = ({
  title = 'Catatan',
  onCreateNote,
  showCreateButton = true,
  className,
  ...props
}) => {
  const handleCreate = useCreateNote(onCreateNote);

  return (
    <div
      data-testid="sidebar-toolbar"
      className={cn(
        'flex items-center justify-between gap-2 pb-2 border-b border-border px-1 select-none w-full min-w-0',
        className,
      )}
      {...props}
    >
      <span
        data-testid="sidebar-toolbar-title"
        className="text-xs font-semibold text-muted-foreground tracking-wider uppercase truncate min-w-0"
      >
        {title}
      </span>
      {showCreateButton && (
        <Button
          size="sm"
          data-testid="sidebar-create-note-button"
          aria-label="Catatan Baru"
          className="h-7 text-xs px-2.5 flex items-center gap-1 font-medium shrink-0"
          onClick={handleCreate}
        >
          <Plus className="w-3.5 h-3.5" />
          Catatan Baru
        </Button>
      )}
    </div>
  );
};

SidebarToolbar.displayName = 'SidebarToolbar';

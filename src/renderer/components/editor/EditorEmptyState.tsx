import * as React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';

export interface EditorEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Callback kustom ketika tombol buat catatan diklik.
   * Jika tidak disediakan, memanggil window.electronAPI.notes.create().
   */
  onCreateNote?: () => void;
}

/**
 * EditorEmptyState
 *
 * Tampilan saat belum ada catatan yang aktif/dipilih di panel editor
 * (Architecture §17, PRD US#21, DESIGN.md §5.4).
 * Terpusat di kanvas dengan visual tenang dan tombol aksi pembuatan catatan.
 */
export const EditorEmptyState: React.FC<EditorEmptyStateProps> = ({
  onCreateNote,
  className,
  ...props
}) => {
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateNote = React.useCallback(async () => {
    if (onCreateNote) {
      onCreateNote();
      return;
    }

    if (typeof window !== 'undefined' && window.electronAPI?.notes?.create) {
      try {
        setIsCreating(true);
        const result = await window.electronAPI.notes.create();
        if (result.success) {
          useNotesStore.getState().setField('activeNote', result.data);
          useNotesStore.getState().upsertNote(result.data);
          useUIStore.getState().setActiveNoteId(result.data.id);
        }
      } catch (err) {
        console.error('EditorEmptyState: Gagal membuat catatan baru:', err);
      } finally {
        setIsCreating(false);
      }
    }
  }, [onCreateNote]);

  return (
    <div
      data-testid="editor-empty-state"
      className={cn(
        'flex flex-col items-center justify-center h-full w-full p-8 text-center select-none',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center max-w-sm space-y-4">
        {/* Subtle Icon Badge */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/40 border border-border text-muted-foreground/80 shadow-sm transition-transform duration-200 hover:scale-105">
          <FileText className="w-7 h-7" aria-hidden="true" />
        </div>

        {/* Title & Friendly Description (DESIGN.md §5.4) */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Tidak ada catatan yang dipilih
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pilih catatan dari daftar di samping, atau buat catatan baru untuk mulai menulis.
          </p>
        </div>

        {/* Call-to-Action Button */}
        <div className="pt-2">
          <Button
            data-testid="editor-empty-state-create-btn"
            variant="default"
            size="sm"
            onClick={() => {
              void handleCreateNote();
            }}
            disabled={isCreating}
            className="h-9 px-4 gap-1.5 text-xs font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Membuat...' : 'Buat Catatan Baru'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

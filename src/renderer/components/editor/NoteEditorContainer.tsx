import * as React from 'react';
import { ExternalLink, Check, Loader2, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useEditor } from '@renderer/hooks/useEditor';
import { EditorEmptyState } from './EditorEmptyState';
import { EditorSkeleton } from './EditorSkeleton';
import { ConflictResolveDialog } from '@renderer/components/dialogs/ConflictResolveDialog';
import type { Note } from '@shared/types/note';

export interface NoteEditorContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Catatan yang akan diedit (opsional).
   * Jika tidak disediakan, otomatis mengambil dari useUIStore.activeNoteId & useNotesStore.activeNote.
   */
  note?: Note | null;

  /**
   * Mode baca saja (opsional).
   */
  readOnly?: boolean;

  /**
   * Callback saat catatan berhasil disimpan.
   */
  onNoteUpdated?: (note: Note) => void;

  /**
   * Callback ketika tombol "Buka di Jendela Baru" diklik.
   */
  onOpenChildWindow?: (noteId: number) => void;

  /**
   * Menentukan apakah tombol "Buka di Jendela Baru" ditampilkan pada header editor.
   * Default: true (aktif di window utama, dapat dinonaktifkan di child window).
   */
  showOpenChildButton?: boolean;
}

interface InnerEditorProps {
  note: Note;
  readOnly?: boolean;
  onNoteUpdated?: (note: Note) => void;
  onOpenChildWindow?: (noteId: number) => void;
  showOpenChildButton?: boolean;
}

/**
 * Format timestamp sederhana 'HH:mm' untuk indikator waktu simpan.
 */
function formatSimpleTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Inner Editor Component (Architecture §17 Kategori B, PRD US#12, US#13).
 * Di-mount dengan `key={note.id}` oleh NoteEditorContainer agar instance
 * Editor.js benar-benar terisolasi dan di-remount bersih saat berpindah catatan.
 */
const InnerEditor: React.FC<InnerEditorProps> = ({
  note,
  readOnly = false,
  onNoteUpdated,
  onOpenChildWindow,
  showOpenChildButton = true,
}) => {
  const holderId = `editorjs-container-${note.id}`;

  const { saveStatus, isConflict, resolveReload, resolveKeepLocal } = useEditor({
    note,
    holderId,
    readOnly,
    onSaveSuccess: onNoteUpdated,
  });

  const [showConflictDialog, setShowConflictDialog] = React.useState<boolean>(false);

  // Otomatis buka dialog saat terdeteksi konflik revisi baru
  React.useEffect(() => {
    if (isConflict) {
      setShowConflictDialog(true);
    } else {
      setShowConflictDialog(false);
    }
  }, [isConflict]);

  const handleOpenChild = React.useCallback(() => {
    if (onOpenChildWindow) {
      onOpenChildWindow(note.id);
    } else if (typeof window !== 'undefined' && window.electronAPI?.windows?.openChild) {
      window.electronAPI.windows.openChild(note.id);
    }
  }, [note.id, onOpenChildWindow]);

  const handleCopyConflictText = React.useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const texts: string[] = [];
      if (note.content && Array.isArray(note.content.blocks)) {
        for (const block of note.content.blocks) {
          if (block.data && typeof block.data.text === 'string') {
            texts.push(block.data.text);
          }
        }
      }
      void navigator.clipboard.writeText(texts.join('\n\n'));
    }
  }, [note.content]);

  return (
    <div
      data-testid={`note-editor-instance-${note.id}`}
      className="flex flex-col h-full w-full overflow-hidden bg-background"
    >
      {/* Sticky Top Editor Header (DESIGN.md §4.2, PRD US#12) */}
      <header
        data-testid="editor-sticky-header"
        className="sticky top-0 z-10 flex items-center justify-between h-10 px-6 border-b border-border/70 bg-background/95 backdrop-blur shrink-0 select-none"
      >
        {/* Left: Auto-save status indicator (DESIGN.md §4.2) */}
        <div
          data-testid="editor-save-status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-warning font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan...</span>
            </span>
          )}

          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-success font-medium">
              <Check className="w-3.5 h-3.5 text-success" />
              <span>Tersimpan {formatSimpleTime(note.updatedAt)}</span>
            </span>
          )}

          {saveStatus === 'conflict' && (
            <span className="flex items-center gap-1.5 text-warning font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
              <span>Konflik revisi</span>
            </span>
          )}

          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span>Gagal menyimpan</span>
            </span>
          )}

          {saveStatus === 'idle' && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-border" />
              <span>Diedit {formatSimpleTime(note.updatedAt)}</span>
            </span>
          )}
        </div>

        {/* Right: Actions (Buka di Jendela Baru - PRD US#30, DESIGN.md §4.2) */}
        {showOpenChildButton && (
          <div className="flex items-center gap-1">
            <Button
              data-testid="editor-open-child-btn"
              variant="ghost"
              size="sm"
              onClick={handleOpenChild}
              title="Buka di Jendela Baru"
              className="no-drag h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka di Jendela Baru</span>
            </Button>
          </div>
        )}
      </header>

      {/* Banner Konflik Revisi (OCC - Architecture §7.1, PRD US#60) */}
      {isConflict && (
        <div
          data-testid="editor-conflict-banner"
          className="flex items-center justify-between px-6 py-2 bg-warning/10 border-b border-warning/30 text-xs text-warning"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-warning" />
            <span>
              Catatan ini telah diperbarui di jendela lain. Pilih tindakan untuk melanjutkan:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="editor-open-conflict-dialog-btn"
              variant="outline"
              size="sm"
              onClick={() => setShowConflictDialog(true)}
              className="h-6 text-[11px] px-2 gap-1 border-warning/40 text-warning hover:bg-warning/10"
            >
              Lihat Opsi Resolusi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyConflictText}
              className="h-6 text-[11px] px-2 gap-1 border-warning/40 text-warning hover:bg-warning/10"
            >
              <Copy className="w-3 h-3" />
              Salin Draf
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void resolveReload()}
              className="h-6 text-[11px] px-2 gap-1 border-warning/40 text-warning hover:bg-warning/10"
            >
              <RefreshCw className="w-3 h-3" />
              Muat Ulang
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => void resolveKeepLocal()}
              className="h-6 text-[11px] px-2 text-primary-foreground bg-warning hover:bg-warning/90"
            >
              Timpa Server
            </Button>
          </div>
        </div>
      )}

      {/* Modal Dialog Resolusi Konflik (Architecture §7.1, PRD US#60, DESIGN.md §5.3, TASK.md [P14-T2]) */}
      <ConflictResolveDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        onReload={resolveReload}
        onCopyLocal={handleCopyConflictText}
        onOverwrite={resolveKeepLocal}
        noteTitle={note.title}
      />

      {/* Independent Scrollable Content Area (PRD US#12, US#19, DESIGN.md §3.1) */}
      <div
        data-testid="editor-scroll-viewport"
        className="flex-1 w-full overflow-y-auto pl-12 pr-4 md:pl-16 md:pr-8 py-8 select-text"
        spellCheck={false}
      >
        {/* Editor Centered Canvas (Max-width: 740px - DESIGN.md §3.1, §4.1) */}
        <div className="w-full max-w-[740px] mx-auto min-h-[500px]">
          <div
            id={holderId}
            data-testid="editorjs-holder"
            className="w-full focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * NoteEditorContainer (Architecture §17 Kategori B, PRD US#12, US#13, US#21).
 *
 * Mengelola penyajian editor catatan atau empty state:
 * - Mengambil catatan aktif dari useUIStore / useNotesStore atau prop.
 * - Membungkus instance editor dengan `key={activeNote.id}` agar React melakukan
 *   remount bersih saat berpindah catatan tanpa ada sisa konten sebelumnya.
 * - Menyajikan header sticky dan viewport scroll yang independen.
 */
export const NoteEditorContainer: React.FC<NoteEditorContainerProps> = ({
  note: propNote,
  readOnly = false,
  onNoteUpdated,
  onOpenChildWindow,
  showOpenChildButton = true,
  className,
  ...props
}) => {
  const storeActiveNote = useNotesStore((state) => state.activeNote);
  const activeNoteId = useUIStore((state) => state.activeNoteId);
  const isLoading = useNotesStore((state) => state.isLoading);

  // Ambil note aktif dari prop atau store jika id cocok
  const activeNote =
    propNote !== undefined
      ? propNote
      : activeNoteId !== null && storeActiveNote?.id === activeNoteId
        ? storeActiveNote
        : null;

  // Guard fallback fetch agar tidak balapan dengan MainWindowLayout atau double fetch
  const fetchingIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (propNote !== undefined) return;
    if (isLoading) return;

    if (activeNoteId !== null && (!storeActiveNote || storeActiveNote.id !== activeNoteId)) {
      if (fetchingIdRef.current === activeNoteId) return;
      fetchingIdRef.current = activeNoteId;

      if (typeof window !== 'undefined' && window.electronAPI?.notes?.getById) {
        void window.electronAPI.notes
          .getById(activeNoteId)
          .then((result) => {
            fetchingIdRef.current = null;
            if (result.success) {
              useNotesStore.getState().setField('activeNote', result.data);
              useNotesStore.getState().upsertNote(result.data);
            }
          })
          .catch(() => {
            fetchingIdRef.current = null;
          });
      }
    }
  }, [activeNoteId, storeActiveNote, propNote, isLoading]);

  // 1. Jika propNote eksplisit null: tampilkan Empty State
  if (propNote === null) {
    return (
      <div
        data-testid="note-editor-container-empty"
        className={cn('h-full w-full overflow-hidden flex flex-col', className)}
        {...props}
      >
        <EditorEmptyState />
      </div>
    );
  }

  // 2. Jika propNote tidak disediakan dan sedang proses pemuatan data awal: tampilkan Skeleton Loading (anti-glitch)
  if (propNote === undefined && isLoading) {
    return (
      <div
        data-testid="note-editor-container-loading"
        className={cn('h-full w-full overflow-hidden flex flex-col', className)}
        {...props}
      >
        <EditorSkeleton />
      </div>
    );
  }

  // 3. Jika tidak ada catatan yang dipilih/aktif (setelah loading selesai): tampilkan Empty State (PRD US#21, DESIGN.md §5.4)
  if (propNote === undefined && activeNoteId === null) {
    return (
      <div
        data-testid="note-editor-container-empty"
        className={cn('h-full w-full overflow-hidden flex flex-col', className)}
        {...props}
      >
        <EditorEmptyState />
      </div>
    );
  }

  // 4. Jika activeNoteId ada namun data catatan masih proses pemuatan IPC: tampilkan Skeleton Loading (UX mulus)
  if (!activeNote) {
    return (
      <div
        data-testid="note-editor-container-loading"
        className={cn('h-full w-full overflow-hidden flex flex-col', className)}
        {...props}
      >
        <EditorSkeleton />
      </div>
    );
  }

  // 3. Gunakan key={activeNote.id} untuk menjamin remount instan dan bebas bug (PRD US#13)
  return (
    <div
      data-testid="note-editor-container"
      className={cn('h-full w-full overflow-hidden flex flex-col', className)}
      {...props}
    >
      <InnerEditor
        key={activeNote.id}
        note={activeNote}
        readOnly={readOnly}
        onNoteUpdated={onNoteUpdated}
        onOpenChildWindow={onOpenChildWindow}
        showOpenChildButton={showOpenChildButton}
      />
    </div>
  );
};

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { TitleBar } from '@renderer/components/chrome/TitleBar';
import { WindowControls } from '@renderer/components/chrome/WindowControls';
import { ThemeToggle } from '@renderer/components/chrome/ThemeToggle';
import { NoteEditorContainer } from '@renderer/components/editor/NoteEditorContainer';
import { EditorSkeleton } from '@renderer/components/editor/EditorSkeleton';
import type { Note } from '@shared/types/note';

export interface ChildWindowLayoutProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /**
   * Override note ID (jika tidak mengambil dari URL parameter ?noteId=...).
   */
  noteId?: number;

  /**
   * TitleBar title override.
   */
  title?: React.ReactNode;

  /**
   * Custom children canvas override (opsional untuk testing).
   */
  children?: React.ReactNode;
}

/**
 * Child Window Layout Shell (Architecture §9, §17 Kategori E, PRD US#32, US#33).
 * - Khusus jendela sekunder fokus satu catatan tanpa sidebar daftar catatan (PRD US#32).
 * - Membaca noteId dari URL param `?noteId=...` dan fetch via IPC notes.getById (PRD US#33).
 * - Dilengkapi TitleBar frameless (38px), WindowControls, dan toggle tema.
 * - Menangani loading (EditorSkeleton) dan empty state jika ID tidak ditemukan.
 */
export const ChildWindowLayout: React.FC<ChildWindowLayoutProps> = ({
  noteId: propNoteId,
  title: propTitle,
  children,
  className,
  ...props
}) => {
  // Parsing noteId dari query string jika tidak disediakan lewat prop
  const effectiveNoteId = React.useMemo(() => {
    if (typeof propNoteId === 'number' && Number.isFinite(propNoteId)) {
      return propNoteId;
    }
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get('noteId');
    if (!rawId) return null;
    const parsed = parseInt(rawId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [propNoteId]);

  const [loadedNote, setLoadedNote] = React.useState<Note | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(effectiveNoteId !== null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Sinkronisasi dengan store aktif jika noteId cocok
  const storeActiveNote = useNotesStore((state) => state.activeNote);
  const currentNote =
    storeActiveNote && storeActiveNote.id === effectiveNoteId ? storeActiveNote : loadedNote;

  // Single fetch data catatan saat mount
  React.useEffect(() => {
    if (effectiveNoteId === null) {
      setIsLoading(false);
      setErrorMessage('ID Catatan tidak valid atau tidak disertakan di URL.');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    if (typeof window !== 'undefined' && typeof window.electronAPI?.notes?.getById === 'function') {
      void window.electronAPI.notes
        .getById(effectiveNoteId)
        .then((res) => {
          if (!isMounted) return;
          if (res.success) {
            setLoadedNote(res.data);
            useNotesStore.getState().upsertNote(res.data);
            useNotesStore.getState().setField('activeNote', res.data);
          } else {
            setErrorMessage(
              res.error.message || `Catatan dengan ID ${effectiveNoteId} tidak ditemukan.`,
            );
          }
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (!isMounted) return;
          setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat catatan.');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveNoteId]);

  const handleNoteUpdated = React.useCallback((updated: Note) => {
    setLoadedNote(updated);
    useNotesStore.getState().upsertNote(updated);
  }, []);

  const displayTitle =
    propTitle ?? (currentNote?.title ? `Personal Note — ${currentNote.title}` : 'Personal Note');

  return (
    <div
      data-testid="child-window-layout"
      className={cn(
        'flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none',
        className,
      )}
      {...props}
    >
      {/* 38px Frameless TitleBar Chrome */}
      <TitleBar
        title={displayTitle}
        leftContent={
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary tracking-tight text-sm">Personal Note</span>
            {currentNote?.title && (
              <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                / {currentNote.title}
              </span>
            )}
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2 h-full">
            <ThemeToggle />
            <WindowControls />
          </div>
        }
      />

      {/* Main Content Workspace: Editor Saja (Tanpa Sidebar / Splitter) */}
      <main
        data-testid="child-layout-content"
        className="flex-1 w-full h-[calc(100vh-38px)] overflow-hidden bg-background flex flex-col select-text"
      >
        {children ?? (
          <>
            {isLoading && (
              <div data-testid="child-layout-loading" className="h-full w-full">
                <EditorSkeleton />
              </div>
            )}

            {!isLoading && errorMessage && (
              <div
                data-testid="child-layout-error"
                className="flex flex-col items-center justify-center h-full p-8 text-center"
              >
                <div className="p-3 rounded-full bg-destructive/10 text-destructive mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-1">
                  Catatan Tidak Ditemukan
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">{errorMessage}</p>
              </div>
            )}

            {!isLoading && !errorMessage && currentNote && (
              <NoteEditorContainer
                note={currentNote}
                onNoteUpdated={handleNoteUpdated}
                showOpenChildButton={false}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

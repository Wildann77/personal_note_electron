import * as React from 'react';
import { cn } from '@renderer/lib/utils';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { TitleBar } from '@renderer/components/chrome/TitleBar';
import { WindowControls } from '@renderer/components/chrome/WindowControls';
import { ThemeToggle } from '@renderer/components/chrome/ThemeToggle';
import { BackupButton } from '@renderer/components/chrome/BackupButton';
import { Splitter } from '@renderer/components/ui/splitter';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Button } from '@renderer/components/ui/button';
import { NoteList } from '@renderer/components/sidebar/NoteList';
import { SidebarToolbar } from '@renderer/components/sidebar/SidebarToolbar';
import { NoteEditorContainer } from '@renderer/components/editor/NoteEditorContainer';
import { DeleteConfirmDialog } from '@renderer/components/dialogs/DeleteConfirmDialog';
import { ConflictResolveDialog } from '@renderer/components/dialogs/ConflictResolveDialog';
import { executeCreateNote } from '@renderer/components/sidebar/useCreateNote';

export interface MainWindowLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * TitleBar title override. Defaults to "Personal Note".
   */
  title?: React.ReactNode;

  /**
   * Custom left slot in TitleBar (e.g. app logo, sidebar actions).
   */
  headerLeftContent?: React.ReactNode;

  /**
   * Custom center slot in TitleBar.
   */
  headerCenterContent?: React.ReactNode;

  /**
   * Custom right slot in TitleBar before window controls (e.g. sync badge, theme toggle).
   */
  headerRightContent?: React.ReactNode;

  /**
   * Sidebar content node (NoteList, new note button, etc.).
   */
  sidebarContent?: React.ReactNode;

  /**
   * Main content / editor canvas.
   */
  children?: React.ReactNode;
}

/**
 * Main Window Layout Shell (Architecture §14, §17, PRD US#38–47, DESIGN.md §4).
 * - Fixed 38px custom frameless TitleBar with adaptive WindowControls.
 * - Resizable sidebar with persistent width via `useUIStore.sidebarWidth`.
 * - Tactile 1px Splitter with 6px hit-box.
 * - Isolated scrolling viewports for sidebar and editor canvas.
 * - Single Initial Fetch: Mengambil data catatan dari SQLite via IPC tepat 1 kali saat mount
 *   (Architecture §17 PRD Further Note #2, PRD US#22, US#23).
 */
export const MainWindowLayout: React.FC<MainWindowLayoutProps> = ({
  title = 'Personal Note',
  headerLeftContent,
  headerCenterContent,
  headerRightContent,
  sidebarContent,
  children,
  className,
  ...props
}) => {
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);

  const [showConflictDialog, setShowConflictDialog] = React.useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState<boolean>(false);

  // Single initial fetch guard ref (Further Note #2)
  const hasFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    if (typeof window !== 'undefined' && typeof window.electronAPI?.notes?.getAll === 'function') {
      useNotesStore.getState().setField('isLoading', true);
      void window.electronAPI.notes
        .getAll()
        .then((res) => {
          if (res.success) {
            res.data.forEach((note) => {
              useNotesStore.getState().upsertNote(note);
            });

            if (res.data.length > 0) {
              const savedActiveId = useUIStore.getState().activeNoteId;
              const targetId =
                savedActiveId !== null && res.data.some((n) => n.id === savedActiveId)
                  ? savedActiveId
                  : res.data[0].id;

              useUIStore.getState().setActiveNoteId(targetId);

              if (typeof window.electronAPI?.notes?.getById === 'function') {
                void window.electronAPI.notes.getById(targetId).then((noteRes) => {
                  if (noteRes.success) {
                    useNotesStore.getState().setField('activeNote', noteRes.data);
                    useNotesStore.getState().upsertNote(noteRes.data);
                  }
                  useNotesStore.getState().setField('isLoading', false);
                });
                return;
              }
            } else {
              useUIStore.getState().setActiveNoteId(null);
              useNotesStore.getState().setField('activeNote', null);
            }
          }
          useNotesStore.getState().setField('isLoading', false);
        })
        .catch(() => {
          useNotesStore.getState().setField('isLoading', false);
        });
    } else {
      useNotesStore.getState().setField('isLoading', false);
    }
  }, []);

  // Listen to native Menu Bar "Catatan Baru" / CmdOrCtrl+N trigger (PRD US#52, US#53)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.notes?.onCreateRequested) {
      return;
    }
    const unsubscribe = window.electronAPI.notes.onCreateRequested(() => {
      void executeCreateNote();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const storeActiveNote = useNotesStore((state) => state.activeNote);

  const effectiveHeaderLeft =
    headerLeftContent ??
    (title !== 'Personal Note' ? undefined : (
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary tracking-tight text-sm">Personal Note</span>
        {storeActiveNote?.title && (
          <span className="text-xs text-muted-foreground truncate max-w-[220px]">
            / {storeActiveNote.title}
          </span>
        )}
      </div>
    ));

  const effectiveHeaderRight = headerRightContent ?? (
    <div className="flex items-center gap-1.5">
      <BackupButton />
      <ThemeToggle />
    </div>
  );

  const defaultSidebarContent = (
    <div className="flex flex-col h-full p-2 space-y-2 select-none overflow-hidden">
      <SidebarToolbar />

      {/* Area Daftar Catatan (Virtualized & Grouped) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <NoteList />
      </div>

      <div className="mt-auto pt-2 border-t border-border space-y-2 px-1">
        <div className="text-[11px] text-muted-foreground">
          Lebar Sidebar: <span className="font-mono text-primary">{sidebarWidth}px</span>
        </div>

        {/* Panel Quick Test Dialogs (Fase 14: P14-T1, P14-T2, P14-T3) - Guarded for DEV only (TASK [P25-T4]) */}
        {import.meta.env.DEV && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-1"
              onClick={() => setShowConflictDialog(true)}
            >
              Test Dialog Konflik
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-1"
              onClick={() => setShowDeleteDialog(true)}
            >
              Test Dialog Hapus
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const defaultMainContent = (
    <>
      {/* Editor Panel Canvas (Fase 13: NoteEditorContainer) */}
      <NoteEditorContainer />

      {/* Modal Dialog Scaffolding - Guarded for DEV only (TASK [P25-T4]) */}
      {import.meta.env.DEV && (
        <>
          {/* Modal Dialog Konfirmasi Hapus (Fase 14: P14-T1) */}
          <DeleteConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={() => {
              setShowDeleteDialog(false);
              alert('Test: Catatan berhasil dikonfirmasi untuk dihapus!');
            }}
            noteTitle="Catatan Contoh Manual Test"
          />

          {/* Modal Dialog Resolusi Konflik (Fase 14: P14-T2) */}
          <ConflictResolveDialog
            open={showConflictDialog}
            onOpenChange={setShowConflictDialog}
            onReload={() => {
              setShowConflictDialog(false);
              alert('Test: Berhasil memuat ulang draf dari database!');
            }}
            onCopyLocal={() => {
              void navigator.clipboard.writeText(
                'Draf lokal yang diselamatkan saat terjadi konflik revisi.',
              );
            }}
            onOverwrite={() => {
              setShowConflictDialog(false);
              alert('Test: Draf lokal berhasil dipaksakan menimpa database!');
            }}
            noteTitle="Catatan Contoh Manual Test (Revisi Konflik)"
          />
        </>
      )}
    </>
  );

  return (
    <div
      data-testid="main-window-layout"
      className={cn(
        'flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none',
        className,
      )}
      {...props}
    >
      {/* 38px Frameless TitleBar Chrome */}
      <TitleBar
        title={title}
        leftContent={effectiveHeaderLeft}
        centerContent={headerCenterContent}
        rightContent={
          <div className="flex items-center gap-2 h-full">
            {effectiveHeaderRight}
            <WindowControls />
          </div>
        }
      />

      {/* Main Content Workspace: Sidebar + Splitter + Editor */}
      <div className="flex flex-1 w-full h-[calc(100vh-38px)] overflow-hidden">
        {/* Sidebar Container */}
        <aside
          data-testid="main-layout-sidebar"
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 h-full overflow-hidden bg-background border-r-0 flex flex-col min-w-0"
        >
          <ScrollArea data-testid="sidebar-scroll-area" className="h-full w-full flex-1 min-w-0">
            {sidebarContent ?? defaultSidebarContent}
          </ScrollArea>
        </aside>

        {/* Resizer Splitter */}
        <Splitter />

        {/* Main Editor Canvas Container */}
        <main
          data-testid="main-layout-content"
          className="flex-1 h-full overflow-hidden min-w-0 bg-background flex flex-col select-text"
        >
          {children ?? defaultMainContent}
        </main>
      </div>
    </div>
  );
};

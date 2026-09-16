import React from 'react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { NoteList } from '@renderer/components/sidebar/NoteList';
import { SidebarToolbar } from '@renderer/components/sidebar/SidebarToolbar';
import { Button } from '@renderer/components/ui/button';
import { NoteEditorContainer } from '@renderer/components/editor/NoteEditorContainer';
import { useSyncListener } from '@renderer/hooks/useSyncListener';
import { DeleteConfirmDialog } from '@renderer/components/dialogs/DeleteConfirmDialog';
import { ConflictResolveDialog } from '@renderer/components/dialogs/ConflictResolveDialog';
import {
  UpdateNoticeDialog,
  UpdateNoticeToast,
} from '@renderer/components/dialogs/UpdateNoticeDialog';

export const App: React.FC = () => {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);
  const [showUpdateDialog, setShowUpdateDialog] = React.useState<boolean>(false);
  const [showUpdateToast, setShowUpdateToast] = React.useState<boolean>(false);
  const [showConflictDialog, setShowConflictDialog] = React.useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState<boolean>(false);

  // Pasang listener real-time sync untuk mutasi antar window (PRD US#37)
  useSyncListener();

  // Sync html dark class with store theme
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Inisialisasi status loading awal sebelum komponen anak me-render frame pertama
  React.useState(() => {
    if (typeof window !== 'undefined' && typeof window.electronAPI?.notes?.getAll === 'function') {
      useNotesStore.getState().setField('isLoading', true);
    }
  });

  // Muat daftar catatan dari SQLite via IPC saat aplikasi dibuka (Anti-glitch & auto-select)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.electronAPI?.notes?.getAll === 'function') {
      useNotesStore.getState().setField('isLoading', true);
      void window.electronAPI.notes.getAll().then((res) => {
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
      });
    } else {
      useNotesStore.getState().setField('isLoading', false);
    }
  }, []);

  return (
    <MainWindowLayout
      title="Personal Note"
      headerLeftContent={
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary tracking-tight text-sm">Personal Note</span>
        </div>
      }
      headerRightContent={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </Button>
        </div>
      }
      sidebarContent={
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

            {/* Panel Quick Test Dialogs (Fase 14: P14-T1, P14-T2, P14-T3) */}
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
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 px-1"
                onClick={() => setShowUpdateDialog(true)}
              >
                Test Dialog Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 px-1"
                onClick={() => setShowUpdateToast(true)}
              >
                Test Toast Update
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {/* Editor Panel Canvas (Fase 13: NoteEditorContainer) */}
      <NoteEditorContainer />

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

      {/* Modal Dialog & Toast Notifikasi Update (Fase 14: P14-T3) */}
      <UpdateNoticeDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        currentVersion="1.0.0"
        latestVersion="1.1.0"
        releaseUrl="https://github.com/electron/electron/releases"
        releaseName="Rilis v1.1.0 — Stabilitas Concurrency & UI Dialog"
        releaseNotes="- Optimistic Concurrency Control (OCC) guard aktif\n- Dialog resolusi konflik dan notifikasi update rilis\n- Virtualized Note List dengan grouping waktu"
        publishedAt="15 September 2026"
      />

      <UpdateNoticeToast
        open={showUpdateToast}
        onClose={() => setShowUpdateToast(false)}
        currentVersion="1.0.0"
        latestVersion="1.1.0"
        releaseUrl="https://github.com/electron/electron/releases"
        releaseNotes="Versi baru v1.1.0 tersedia dengan perbaikan bug dan stabilitas sinkronisasi."
        onOpenDetails={() => {
          setShowUpdateToast(false);
          setShowUpdateDialog(true);
        }}
      />
    </MainWindowLayout>
  );
};

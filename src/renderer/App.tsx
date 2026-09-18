import React from 'react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { ChildWindowLayout } from '@renderer/layouts/ChildWindowLayout';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useSyncListener } from '@renderer/hooks/useSyncListener';
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts';
import {
  UpdateNoticeDialog,
  UpdateNoticeToast,
} from '@renderer/components/dialogs/UpdateNoticeDialog';
import type { UpdateReleasePayload } from '@shared/types/api';

/**
 * Root Application Component (Architecture §9, §17 Kategori E, PRD US#32).
 * - Mendeteksi URL parameter `?type=child` untuk menentukan apakah me-render
 *   `MainWindowLayout` (sidebar + editor) atau `ChildWindowLayout` (editor saja).
 * - Menjaga sinkronisasi tema (dark/light mode) ke root HTML class.
 * - Memasang listener broadcast real-time mutasi data antar-jendela (`useSyncListener`).
 * - Memasang keyboard shortcuts terpadu Ctrl/Cmd+N, Ctrl/Cmd+W, Esc (PRD US#3, US#45, US#53).
 * - Memasang listener notifikasi update GitHub Releases (Architecture §15.3, TASK [P23-T3]).
 */
export const App: React.FC = () => {
  const theme = useUIStore((state) => state.theme);

  // Deteksi mode jendela: child window (?type=child) vs main window
  const isChildWindow = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('type') === 'child';
  }, []);

  // Update notification state
  const [updatePayload, setUpdatePayload] = React.useState<UpdateReleasePayload | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = React.useState<boolean>(false);
  const [showUpdateToast, setShowUpdateToast] = React.useState<boolean>(false);

  // Pasang listener real-time sync untuk mutasi antar window (PRD US#37)
  useSyncListener();

  // Pasang listener keyboard shortcuts terpadu (PRD US#3, US#45, US#53, TASK.md [P18-T3])
  useKeyboardShortcuts({ isChildWindow });

  // Pasang listener update release dari main process (TASK [P23-T3])
  React.useEffect(() => {
    if (isChildWindow) return;
    if (typeof window === 'undefined' || !window.electronAPI?.onUpdateAvailable) return;

    const unsubscribe = window.electronAPI.onUpdateAvailable((payload) => {
      setUpdatePayload(payload);
      setShowUpdateToast(true);
    });

    return () => {
      unsubscribe();
    };
  }, [isChildWindow]);

  // Sync html dark class dan inline background dengan preferensi tema di store (Anti-FOUC sync)
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#000000';
      root.style.color = '#ffffff';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#09090b';
    }
  }, [theme]);

  if (isChildWindow) {
    return <ChildWindowLayout />;
  }

  return (
    <>
      <MainWindowLayout />

      {/* Dynamic In-App Update Notification (Architecture §15.3, PRD US#61, TASK [P23-T3]) */}
      {updatePayload && (
        <>
          <UpdateNoticeDialog
            open={showUpdateDialog}
            onOpenChange={setShowUpdateDialog}
            currentVersion={updatePayload.currentVersion}
            latestVersion={updatePayload.latestVersion}
            releaseUrl={updatePayload.releaseUrl}
            releaseName={updatePayload.releaseName}
            releaseNotes={updatePayload.releaseNotes}
            publishedAt={updatePayload.publishedAt}
          />

          <UpdateNoticeToast
            open={showUpdateToast}
            onClose={() => setShowUpdateToast(false)}
            currentVersion={updatePayload.currentVersion}
            latestVersion={updatePayload.latestVersion}
            releaseUrl={updatePayload.releaseUrl}
            releaseNotes={updatePayload.releaseNotes}
            onOpenDetails={() => {
              setShowUpdateToast(false);
              setShowUpdateDialog(true);
            }}
          />
        </>
      )}
    </>
  );
};

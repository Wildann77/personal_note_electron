import React from 'react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { ChildWindowLayout } from '@renderer/layouts/ChildWindowLayout';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useSyncListener } from '@renderer/hooks/useSyncListener';
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts';

/**
 * Root Application Component (Architecture §9, §17 Kategori E, PRD US#32).
 * - Mendeteksi URL parameter `?type=child` untuk menentukan apakah me-render
 *   `MainWindowLayout` (sidebar + editor) atau `ChildWindowLayout` (editor saja).
 * - Menjaga sinkronisasi tema (dark/light mode) ke root HTML class.
 * - Memasang listener broadcast real-time mutasi data antar-jendela (`useSyncListener`).
 * - Memasang keyboard shortcuts terpadu Ctrl/Cmd+N, Ctrl/Cmd+W, Esc (PRD US#3, US#45, US#53).
 */
export const App: React.FC = () => {
  const theme = useUIStore((state) => state.theme);

  // Deteksi mode jendela: child window (?type=child) vs main window
  const isChildWindow = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('type') === 'child';
  }, []);

  // Pasang listener real-time sync untuk mutasi antar window (PRD US#37)
  useSyncListener();

  // Pasang listener keyboard shortcuts terpadu (PRD US#3, US#45, US#53, TASK.md [P18-T3])
  useKeyboardShortcuts({ isChildWindow });

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

  return <MainWindowLayout />;
};

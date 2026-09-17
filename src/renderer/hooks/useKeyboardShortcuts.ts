import * as React from 'react';
import { executeCreateNote } from '@renderer/components/sidebar/useCreateNote';

export interface UseKeyboardShortcutsOptions {
  /**
   * Whether the active layout is ChildWindow.
   * In ChildWindow, Ctrl/Cmd+N delegates creation to MainWindow.
   */
  isChildWindow?: boolean;

  /**
   * Optional custom handler for Ctrl/Cmd+N (New Note).
   */
  onCreateNote?: () => void | Promise<void>;

  /**
   * Optional custom handler for Ctrl/Cmd+W (Close Window).
   */
  onCloseWindow?: () => void;

  /**
   * Optional custom handler for Escape key (e.g. dismissing popups/toasts).
   */
  onEscape?: () => void;

  /**
   * Whether shortcuts are active. Defaults to true.
   */
  enabled?: boolean;
}

/**
 * useKeyboardShortcuts (PRD US#3, US#45, US#53, Architecture §17, TASK.md [P18-T3]).
 * Centralized keyboard shortcut listener for Electron frameless & child windows.
 *
 * Enforces:
 * - Ctrl/Cmd + N: Buat Catatan Baru (US#3, US#53).
 * - Ctrl/Cmd + W: Tutup Jendela Aktif (US#45).
 * - Escape: Tutup modal/dialog/notifikasi mengambang yang aktif.
 */
export function useKeyboardShortcuts({
  isChildWindow = false,
  onCreateNote,
  onCloseWindow,
  onEscape,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}): void {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier keys: Cmd on macOS or Ctrl on Windows/Linux
      const isModifier = event.metaKey || event.ctrlKey;

      // 1. Ctrl/Cmd + N: Create Note (US#3, US#53)
      if (
        isModifier &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'n' || event.key === 'N')
      ) {
        event.preventDefault();

        if (onCreateNote) {
          void onCreateNote();
          return;
        }

        if (isChildWindow) {
          // Delegated creation from ChildWindow: creates note in SQLite,
          // triggering ElectronEventHub broadcast to MainWindow.
          void window.electronAPI?.notes?.create?.();
        } else {
          void executeCreateNote();
        }
        return;
      }

      // 2. Ctrl/Cmd + W: Close Active Window (US#45)
      if (
        isModifier &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'w' || event.key === 'W')
      ) {
        event.preventDefault();

        if (onCloseWindow) {
          onCloseWindow();
        } else if (window.electronAPI?.windowControls?.close) {
          window.electronAPI.windowControls.close();
        }
        return;
      }

      // 3. Escape: Dismiss active popups / trigger escape handler
      if (event.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, isChildWindow, onCreateNote, onCloseWindow, onEscape]);
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_DEFAULT_WIDTH = 280;
export const SIDEBAR_MAX_WIDTH = 480;
export const UI_STORE_STORAGE_KEY = 'personal-note-ui-store';

export type ThemeMode = 'dark' | 'light';

/**
 * Lightweight persistent UI state data attributes (PRD US#49, Further Notes #3).
 * Exclusively holds lightweight presentation preferences.
 */
export interface UIStateData {
  theme: ThemeMode;
  sidebarWidth: number;
  activeNoteId: number | null;
}

/**
 * UI State actions for theme, sidebar layout, and note selection.
 */
export interface UIStateActions {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveNoteId: (id: number | null) => void;
  resetUI: () => void;
}

export type UIStore = UIStateData & UIStateActions;

export const initialUIState: UIStateData = {
  theme: 'dark',
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  activeNoteId: null,
};

/**
 * Clamps numeric sidebar width between defined minimum and maximum boundaries.
 */
export function clampSidebarWidth(width: number): number {
  if (Number.isNaN(width) || !Number.isFinite(width)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

/**
 * Persistent UI Store for lightweight layout and theme states.
 * Uses localStorage key 'personal-note-ui-store' matching Anti-FOUC script.
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialUIState,

      setTheme: (theme) => {
        set({ theme });
      },

      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        }));
      },

      setSidebarWidth: (width) => {
        set({ sidebarWidth: clampSidebarWidth(width) });
      },

      setActiveNoteId: (activeNoteId) => {
        set({ activeNoteId });
      },

      resetUI: () => {
        set(initialUIState);
      },
    }),
    {
      name: UI_STORE_STORAGE_KEY,
      partialize: (state): UIStateData => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        activeNoteId: state.activeNoteId,
      }),
    },
  ),
);

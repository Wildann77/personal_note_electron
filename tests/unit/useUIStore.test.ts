import { describe, it, expect, beforeEach } from 'vitest';
import {
  useUIStore,
  initialUIState,
  clampSidebarWidth,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  UI_STORE_STORAGE_KEY,
  initUIStoreCrossWindowSync,
} from '@renderer/stores/useUIStore';

describe('useUIStore (Lightweight Persist)', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.getState().resetUI();
  });

  it('initializes with dark theme, 280px sidebar, and null activeNoteId', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(state.activeNoteId).toBeNull();
  });

  describe('Theme Management (US#48, US#49)', () => {
    it('updates theme explicitly with setTheme', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');

      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('toggles theme back and forth with toggleTheme', () => {
      expect(useUIStore.getState().theme).toBe('dark');

      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('light');

      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('dark');
    });
  });

  describe('Sidebar Resizing & Boundary Clamping (DESIGN.md §4.3)', () => {
    it('sets valid sidebar width directly', () => {
      useUIStore.getState().setSidebarWidth(320);
      expect(useUIStore.getState().sidebarWidth).toBe(320);
    });

    it('clamps width to SIDEBAR_MIN_WIDTH (220px) when given value is below minimum', () => {
      useUIStore.getState().setSidebarWidth(150);
      expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
    });

    it('clamps width to SIDEBAR_MAX_WIDTH (480px) when given value is above maximum', () => {
      useUIStore.getState().setSidebarWidth(600);
      expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
    });

    it('handles exact boundary values properly', () => {
      useUIStore.getState().setSidebarWidth(SIDEBAR_MIN_WIDTH);
      expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);

      useUIStore.getState().setSidebarWidth(SIDEBAR_MAX_WIDTH);
      expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
    });

    it('falls back to default width when invalid number or NaN is provided to helper', () => {
      expect(clampSidebarWidth(NaN)).toBe(SIDEBAR_DEFAULT_WIDTH);
      expect(clampSidebarWidth(Infinity)).toBe(SIDEBAR_DEFAULT_WIDTH);
      expect(clampSidebarWidth(-Infinity)).toBe(SIDEBAR_DEFAULT_WIDTH);
    });
  });

  describe('Active Note Selection', () => {
    it('sets active note id and clears it with null', () => {
      useUIStore.getState().setActiveNoteId(42);
      expect(useUIStore.getState().activeNoteId).toBe(42);

      useUIStore.getState().setActiveNoteId(null);
      expect(useUIStore.getState().activeNoteId).toBeNull();
    });
  });

  describe('LocalStorage Persistence (Further Notes #3)', () => {
    it('persists only lightweight state keys to localStorage under UI_STORE_STORAGE_KEY', () => {
      useUIStore.getState().setTheme('light');
      useUIStore.getState().setSidebarWidth(360);
      useUIStore.getState().setActiveNoteId(99);

      const raw = localStorage.getItem(UI_STORE_STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw as string) as {
        state: Record<string, unknown>;
      };
      expect(parsed.state).toEqual({
        theme: 'light',
        sidebarWidth: 360,
        activeNoteId: 99,
      });

      // Assert actions are NOT saved to storage (clean partialize)
      expect(parsed.state['setTheme']).toBeUndefined();
      expect(parsed.state['toggleTheme']).toBeUndefined();
      expect(parsed.state['setSidebarWidth']).toBeUndefined();
      expect(parsed.state['setActiveNoteId']).toBeUndefined();
      expect(parsed.state['resetUI']).toBeUndefined();

      // Ensure storage payload size is minimal (< 500 bytes)
      expect(raw!.length).toBeLessThan(500);
    });
  });

  describe('resetUI', () => {
    it('resets all UI states back to default', () => {
      useUIStore.getState().setTheme('light');
      useUIStore.getState().setSidebarWidth(450);
      useUIStore.getState().setActiveNoteId(10);

      useUIStore.getState().resetUI();

      const state = useUIStore.getState();
      expect(state.theme).toBe(initialUIState.theme);
      expect(state.sidebarWidth).toBe(initialUIState.sidebarWidth);
      expect(state.activeNoteId).toBe(initialUIState.activeNoteId);
    });
  });

  describe('Cross-Window Synchronization (US#48, US#49)', () => {
    it('rehydrates store when storage event fires for UI_STORE_STORAGE_KEY', () => {
      expect(useUIStore.getState().theme).toBe('dark');

      localStorage.setItem(
        UI_STORE_STORAGE_KEY,
        JSON.stringify({
          state: { theme: 'light', sidebarWidth: 280, activeNoteId: null },
          version: 0,
        }),
      );

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: UI_STORE_STORAGE_KEY,
        }),
      );

      expect(useUIStore.getState().theme).toBe('light');
    });

    it('ignores storage events for other unrelated keys', () => {
      expect(useUIStore.getState().theme).toBe('dark');

      localStorage.setItem(
        UI_STORE_STORAGE_KEY,
        JSON.stringify({
          state: { theme: 'light', sidebarWidth: 280, activeNoteId: null },
          version: 0,
        }),
      );

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some-other-unrelated-key',
        }),
      );

      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('returns cleanup function from initUIStoreCrossWindowSync', () => {
      const cleanup = initUIStoreCrossWindowSync();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});

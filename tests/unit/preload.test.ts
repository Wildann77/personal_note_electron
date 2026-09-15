import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import type { CreateNoteInput, UpdateNoteInput } from '@shared/types/api';
import type { NoteMutationPayload } from '@shared/types/note';

const { mockExposeInMainWorld, mockInvoke, mockSend, mockOn, mockRemoveListener } = vi.hoisted(
  () => ({
    mockExposeInMainWorld: vi.fn(),
    mockInvoke: vi.fn(),
    mockSend: vi.fn(),
    mockOn: vi.fn(),
    mockRemoveListener: vi.fn(),
  }),
);

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
  ipcRenderer: {
    invoke: mockInvoke,
    send: mockSend,
    on: mockOn,
    removeListener: mockRemoveListener,
  },
}));

import { electronAPI } from '@preload/index';

describe('Preload Bridge (Unit - [P7-T1], Architecture §3.1, §4.1, PRD §Antarmuka Kunci)', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockSend.mockClear();
    mockOn.mockClear();
    mockRemoveListener.mockClear();
  });

  describe('ContextBridge Registration', () => {
    it('exposes electronAPI to main world via contextBridge', async () => {
      mockExposeInMainWorld.mockClear();
      vi.resetModules();
      await import('@preload/index');

      expect(mockExposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    });

    it('contains all required ISP sub-interfaces without Node.js leaks', () => {
      expect(electronAPI).toHaveProperty('notes');
      expect(electronAPI).toHaveProperty('windowControls');
      expect(electronAPI).toHaveProperty('windows');
      expect(electronAPI).toHaveProperty('contextMenu');
      expect(electronAPI).toHaveProperty('backup');
      expect(electronAPI).toHaveProperty('theme');
      expect(electronAPI).toHaveProperty('platform', process.platform);

      // Ensure no raw Node.js modules are exposed
      expect(electronAPI).not.toHaveProperty('fs');
      expect(electronAPI).not.toHaveProperty('path');
      expect(electronAPI).not.toHaveProperty('child_process');
      expect(electronAPI).not.toHaveProperty('process');
    });
  });

  describe('notes API', () => {
    it('getAll invokes IPC_CHANNELS.NOTES_GET_ALL', async () => {
      mockInvoke.mockResolvedValueOnce({ success: true, data: [] });

      const result = await electronAPI.notes.getAll();

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_GET_ALL);
      expect(result).toEqual({ success: true, data: [] });
    });

    it('getById invokes IPC_CHANNELS.NOTES_GET_BY_ID with note id object', async () => {
      const mockNote = { id: 42, title: 'Test Note', revision: 1 };
      mockInvoke.mockResolvedValueOnce({ success: true, data: mockNote });

      const result = await electronAPI.notes.getById(42);

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_GET_BY_ID, { id: 42 });
      expect(result).toEqual({ success: true, data: mockNote });
    });

    it('create invokes IPC_CHANNELS.NOTES_CREATE with input', async () => {
      const input: CreateNoteInput = { title: 'New Note', snippet: 'Snippet' };
      mockInvoke.mockResolvedValueOnce({ success: true, data: { id: 1, ...input } });

      const result = await electronAPI.notes.create(input);

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_CREATE, input);
      expect(result).toEqual({ success: true, data: { id: 1, ...input } });
    });

    it('update invokes IPC_CHANNELS.NOTES_UPDATE with input', async () => {
      const input: UpdateNoteInput = {
        id: 1,
        expectedRevision: 1,
        content: { blocks: [] },
      };
      mockInvoke.mockResolvedValueOnce({ success: true, data: { id: 1, revision: 2 } });

      const result = await electronAPI.notes.update(input);

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_UPDATE, input);
      expect(result).toEqual({ success: true, data: { id: 1, revision: 2 } });
    });

    it('delete invokes IPC_CHANNELS.NOTES_DELETE with id object', async () => {
      mockInvoke.mockResolvedValueOnce({ success: true, data: true });

      const result = await electronAPI.notes.delete(7);

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_DELETE, { id: 7 });
      expect(result).toEqual({ success: true, data: true });
    });

    it('onBroadcastChanged registers listener and returns unsubscribe cleanup function', () => {
      let registeredListener: ((event: unknown, payload: NoteMutationPayload) => void) | undefined;
      mockOn.mockImplementation(
        (channel: string, listener: (event: unknown, payload: NoteMutationPayload) => void) => {
          if (channel === IPC_CHANNELS.NOTES_BROADCAST_CHANGED) {
            registeredListener = listener;
          }
        },
      );

      const callback = vi.fn();
      const unsubscribe = electronAPI.notes.onBroadcastChanged(callback);

      expect(mockOn).toHaveBeenCalledWith(
        IPC_CHANNELS.NOTES_BROADCAST_CHANGED,
        expect.any(Function),
      );

      // Simulate incoming broadcast event
      const payload: NoteMutationPayload = {
        type: 'create',
        noteId: 10,
      };
      registeredListener?.({}, payload);
      expect(callback).toHaveBeenCalledWith(payload);

      // Cleanup
      unsubscribe();
      expect(mockRemoveListener).toHaveBeenCalledWith(
        IPC_CHANNELS.NOTES_BROADCAST_CHANGED,
        expect.any(Function),
      );
    });
  });

  describe('windowControls API', () => {
    it('minimize sends WINDOW_MINIMIZE', () => {
      electronAPI.windowControls.minimize();
      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_MINIMIZE);
    });

    it('maximize sends WINDOW_MAXIMIZE', () => {
      electronAPI.windowControls.maximize();
      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_MAXIMIZE);
    });

    it('close sends WINDOW_CLOSE', () => {
      electronAPI.windowControls.close();
      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_CLOSE);
    });
  });

  describe('windows API', () => {
    it('openChild sends WINDOWS_OPEN_CHILD with noteId', () => {
      electronAPI.windows.openChild(15);
      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.WINDOWS_OPEN_CHILD, 15);
    });
  });

  describe('contextMenu API', () => {
    it('showNote sends CONTEXT_MENU_SHOW_NOTE with noteId', () => {
      electronAPI.contextMenu.showNote(99);
      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE, 99);
    });
  });

  describe('backup API', () => {
    it('triggerBackup invokes BACKUP_TRIGGER and returns Result<string>', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        data: '/path/to/backup.db',
      });

      const result = await electronAPI.backup.triggerBackup();

      expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.BACKUP_TRIGGER);
      expect(result).toEqual({
        success: true,
        data: '/path/to/backup.db',
      });
    });
  });

  describe('theme API', () => {
    it('getSystemTheme returns dark when matchMedia matches dark theme', async () => {
      const matchMediaSpy = vi.fn().mockReturnValue({
        matches: true,
      });
      vi.stubGlobal('matchMedia', matchMediaSpy);

      const theme = await electronAPI.theme.getSystemTheme();
      expect(theme).toBe('dark');
      expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');

      vi.unstubAllGlobals();
    });

    it('getSystemTheme returns light when matchMedia does not match dark theme', async () => {
      const matchMediaSpy = vi.fn().mockReturnValue({
        matches: false,
      });
      vi.stubGlobal('matchMedia', matchMediaSpy);

      const theme = await electronAPI.theme.getSystemTheme();
      expect(theme).toBe('light');

      vi.unstubAllGlobals();
    });

    it('onThemeChanged registers mediaQuery listener and unsubscribes properly', () => {
      let registeredHandler: ((e: MediaQueryListEvent) => void) | undefined;
      const mockAddEventListener = vi.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            registeredHandler = handler;
          }
        },
      );
      const mockRemoveEventListener = vi.fn();

      const matchMediaSpy = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });
      vi.stubGlobal('matchMedia', matchMediaSpy);

      const callback = vi.fn();
      const unsubscribe = electronAPI.theme.onThemeChanged(callback);

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Trigger listener
      registeredHandler?.({ matches: true } as MediaQueryListEvent);
      expect(callback).toHaveBeenCalledWith('dark');

      registeredHandler?.({ matches: false } as MediaQueryListEvent);
      expect(callback).toHaveBeenCalledWith('light');

      // Unsubscribe
      unsubscribe();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      vi.unstubAllGlobals();
    });
  });
});

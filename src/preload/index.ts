import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import type {
  ElectronAPI,
  CreateNoteInput,
  UpdateNoteInput,
  INotesAPI,
  IWindowControlsAPI,
  IWindowsAPI,
  IContextMenuAPI,
  IBackupAPI,
  IThemeAPI,
} from '@shared/types/api';
import type { Note, NoteMetadata, NoteMutationPayload } from '@shared/types/note';
import type { Result } from '@shared/types/result';

const notesAPI: INotesAPI = {
  getAll: (): Promise<Result<NoteMetadata[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOTES_GET_ALL);
  },
  getById: (id: number): Promise<Result<Note>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOTES_GET_BY_ID, { id });
  },
  create: (input?: CreateNoteInput): Promise<Result<Note>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOTES_CREATE, input);
  },
  update: (input: UpdateNoteInput): Promise<Result<Note>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOTES_UPDATE, input);
  },
  delete: (id: number): Promise<Result<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NOTES_DELETE, { id });
  },
  onBroadcastChanged: (callback: (payload: NoteMutationPayload) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: NoteMutationPayload) => {
      callback(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, listener);
    };
  },
};

const windowControlsAPI: IWindowControlsAPI = {
  minimize: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE);
  },
  maximize: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE);
  },
  close: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE);
  },
};

const windowsAPI: IWindowsAPI = {
  openChild: (noteId: number): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOWS_OPEN_CHILD, noteId);
  },
};

const contextMenuAPI: IContextMenuAPI = {
  showNote: (noteId: number): void => {
    ipcRenderer.send(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE, noteId);
  },
};

const backupAPI: IBackupAPI = {
  triggerBackup: (): Promise<Result<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_TRIGGER);
  },
};

const themeAPI: IThemeAPI = {
  getSystemTheme: (): Promise<'dark' | 'light'> => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return Promise.resolve(
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      );
    }
    return Promise.resolve('dark');
  },
  onThemeChanged: (callback: (theme: 'dark' | 'light') => void): (() => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {};
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      callback(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => {
        mediaQuery.removeEventListener('change', listener);
      };
    } else if (
      typeof (
        mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }
      ).addListener === 'function'
    ) {
      (
        mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }
      ).addListener(listener);
      return () => {
        (
          mediaQuery as unknown as {
            removeListener: (cb: (e: MediaQueryListEvent) => void) => void;
          }
        ).removeListener(listener);
      };
    }
    return () => {};
  },
};

export const electronAPI: ElectronAPI = {
  notes: notesAPI,
  windowControls: windowControlsAPI,
  windows: windowsAPI,
  contextMenu: contextMenuAPI,
  backup: backupAPI,
  theme: themeAPI,
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

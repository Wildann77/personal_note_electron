import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow, MenuItem, MenuItemConstructorOptions } from 'electron';
import { MenuManager } from '@main/infrastructure/menu/MenuManager';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';

interface MockMenu {
  items: MenuItemConstructorOptions[];
  popup: ReturnType<typeof vi.fn>;
}

const { mockBuildFromTemplate, mockSetApplicationMenu, mockPopup, mockGetFocusedWindow } =
  vi.hoisted(() => {
    const popupFn = vi.fn();
    const buildFn = vi.fn((template: MenuItemConstructorOptions[]): MockMenu => ({
      items: template,
      popup: popupFn,
    }));
    const setMenuFn = vi.fn();
    const getFocusFn = vi.fn((): BrowserWindow | null => null);

    return {
      mockPopup: popupFn,
      mockBuildFromTemplate: buildFn,
      mockSetApplicationMenu: setMenuFn,
      mockGetFocusedWindow: getFocusFn,
    };
  });

vi.mock('electron', () => ({
  app: {
    name: 'PersonalNote',
  },
  BrowserWindow: {
    getFocusedWindow: (): BrowserWindow | null => mockGetFocusedWindow(),
  },
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]): MockMenu =>
      mockBuildFromTemplate(template),
    setApplicationMenu: (menu: unknown): void => {
      mockSetApplicationMenu(menu);
    },
  },
}));

describe('MenuManager (Unit)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockBuildFromTemplate.mockClear();
    mockSetApplicationMenu.mockClear();
    mockPopup.mockClear();
    mockGetFocusedWindow.mockReset();
    MenuManager.resetForTesting();
    WindowManager.resetForTesting();
  });

  const createMockWindow = () => {
    const sendMock = vi.fn();
    const win = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        isDestroyed: vi.fn().mockReturnValue(false),
        send: sendMock,
      },
    } as unknown as BrowserWindow;

    return { win, sendMock };
  };

  const triggerItemClick = (item?: MenuItemConstructorOptions): void => {
    if (item?.click) {
      item.click({} as MenuItem, undefined, new KeyboardEvent('keydown'));
    }
  };

  describe('buildApplicationMenuTemplate & setupApplicationMenu', () => {
    it('builds template containing File menu with "Catatan Baru" and accelerator', () => {
      const template = MenuManager.buildApplicationMenuTemplate();
      const fileMenu = template.find((m) => m.label === 'File');

      expect(fileMenu).toBeDefined();
      expect(fileMenu?.submenu).toBeDefined();

      const subItems = fileMenu?.submenu as MenuItemConstructorOptions[];
      const newNoteItem = subItems.find((i) => i.label === 'Catatan Baru');

      expect(newNoteItem).toBeDefined();
      expect(newNoteItem?.accelerator).toBe('CmdOrCtrl+N');
      expect(newNoteItem).toHaveProperty('click');
    });

    it('invokes onCreateNote callback when "Catatan Baru" is clicked', () => {
      const createNoteMock = vi.fn();
      const template = MenuManager.buildApplicationMenuTemplate({
        onCreateNote: createNoteMock,
      });

      const fileMenu = template.find((m) => m.label === 'File');
      const subItems = fileMenu?.submenu as MenuItemConstructorOptions[];
      const newNoteItem = subItems.find((i) => i.label === 'Catatan Baru');

      triggerItemClick(newNoteItem);

      expect(createNoteMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to sending IPC event to focused window when no onCreateNote callback', () => {
      const { win, sendMock } = createMockWindow();
      mockGetFocusedWindow.mockReturnValue(win);

      const template = MenuManager.buildApplicationMenuTemplate();
      const fileMenu = template.find((m) => m.label === 'File');
      const subItems = fileMenu?.submenu as MenuItemConstructorOptions[];
      const newNoteItem = subItems.find((i) => i.label === 'Catatan Baru');

      triggerItemClick(newNoteItem);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith('menu:create-note');
    });

    it('sets application menu via Menu.setApplicationMenu', () => {
      const menu = MenuManager.setupApplicationMenu();

      expect(mockBuildFromTemplate).toHaveBeenCalled();
      expect(mockSetApplicationMenu).toHaveBeenCalledWith(menu);
    });
  });

  describe('buildNoteContextMenu & showNoteContextMenu', () => {
    it('creates context menu with "Buka di Jendela Baru" and "Hapus" referencing explicit noteId', () => {
      const { win } = createMockWindow();
      const openMock = vi.fn();
      const deleteMock = vi.fn();

      const noteId = 42;
      MenuManager.buildNoteContextMenu(win, noteId, {
        onOpenInNewWindow: openMock,
        onDeleteNote: deleteMock,
      });

      expect(mockBuildFromTemplate).toHaveBeenCalled();
      const template = mockBuildFromTemplate.mock.calls[0][0];

      const openItem = template.find((i) => i.label === 'Buka di Jendela Baru');
      const deleteItem = template.find((i) => i.label === 'Hapus');

      expect(openItem).toBeDefined();
      expect(deleteItem).toBeDefined();

      triggerItemClick(openItem);
      expect(openMock).toHaveBeenCalledTimes(1);
      expect(openMock).toHaveBeenCalledWith(noteId);

      triggerItemClick(deleteItem);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith(noteId, win);
    });

    it('falls back to WindowManager.createChildWindow when onOpenInNewWindow is not provided', () => {
      const { win } = createMockWindow();
      const childWinMock = vi.fn();
      vi.spyOn(WindowManager, 'createChildWindow').mockImplementation(childWinMock);

      const noteId = 77;
      MenuManager.buildNoteContextMenu(win, noteId);

      const template = mockBuildFromTemplate.mock.calls[0][0];
      const openItem = template.find((i) => i.label === 'Buka di Jendela Baru');

      triggerItemClick(openItem);

      expect(childWinMock).toHaveBeenCalledTimes(1);
      expect(childWinMock).toHaveBeenCalledWith(noteId);
    });

    it('falls back to sending notes:request-delete IPC when onDeleteNote is not provided', () => {
      const { win, sendMock } = createMockWindow();
      const noteId = 88;

      MenuManager.buildNoteContextMenu(win, noteId);

      const template = mockBuildFromTemplate.mock.calls[0][0];
      const deleteItem = template.find((i) => i.label === 'Hapus');

      triggerItemClick(deleteItem);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith('notes:request-delete', noteId);
    });

    it('shows context menu popup anchored to window', () => {
      const { win } = createMockWindow();
      const noteId = 99;

      MenuManager.showNoteContextMenu(win, noteId);

      expect(mockPopup).toHaveBeenCalledWith({ window: win });
    });

    it('uses global actions when set via static methods', () => {
      const { win } = createMockWindow();
      const globalOpen = vi.fn();
      const globalDelete = vi.fn();
      const globalCreate = vi.fn();

      MenuManager.setContextMenuActions({
        onOpenInNewWindow: globalOpen,
        onDeleteNote: globalDelete,
      });
      MenuManager.setApplicationMenuActions({
        onCreateNote: globalCreate,
      });

      const noteId = 123;
      MenuManager.buildNoteContextMenu(win, noteId);

      const contextTemplate = mockBuildFromTemplate.mock.calls[0][0];
      triggerItemClick(contextTemplate.find((i) => i.label === 'Buka di Jendela Baru'));
      triggerItemClick(contextTemplate.find((i) => i.label === 'Hapus'));

      expect(globalOpen).toHaveBeenCalledWith(noteId);
      expect(globalDelete).toHaveBeenCalledWith(noteId, win);

      const appTemplate = MenuManager.buildApplicationMenuTemplate();
      const fileSub = appTemplate.find((m) => m.label === 'File')
        ?.submenu as MenuItemConstructorOptions[];
      triggerItemClick(fileSub.find((i) => i.label === 'Catatan Baru'));

      expect(globalCreate).toHaveBeenCalledTimes(1);
    });
  });
});

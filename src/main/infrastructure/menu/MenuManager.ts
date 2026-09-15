import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { WindowManager } from '../windows/WindowManager';

/**
 * Action callbacks for native application menu items.
 */
export interface ApplicationMenuActions {
  onCreateNote?: () => void;
}

/**
 * Action callbacks for note-specific context menu items.
 */
export interface NoteContextMenuActions {
  onOpenInNewWindow?: (noteId: number) => void;
  onDeleteNote?: (noteId: number, win: BrowserWindow) => void;
}

/**
 * Infrastructure manager for the native OS Application Menu Bar and Note Context Menus.
 * Eliminates loose re-triggering tricks and enforces clean, explicit IPC/action dispatch (PRD US#52–55, Architecture §17 PRD Further Note #4).
 */
export class MenuManager {
  private static globalApplicationActions?: ApplicationMenuActions;
  private static globalContextMenuActions?: NoteContextMenuActions;

  /**
   * Sets default application menu actions across the app lifecycle.
   */
  static setApplicationMenuActions(actions: ApplicationMenuActions): void {
    this.globalApplicationActions = actions;
  }

  /**
   * Sets default context menu actions across the app lifecycle.
   */
  static setContextMenuActions(actions: NoteContextMenuActions): void {
    this.globalContextMenuActions = actions;
  }

  /**
   * Constructs the MenuItem template for the native application menu bar.
   * Includes the mandatory "Catatan Baru" (CmdOrCtrl+N) item.
   */
  static buildApplicationMenuTemplate(
    actions?: ApplicationMenuActions,
  ): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    const effectiveActions = actions ?? this.globalApplicationActions;

    const handleCreateNote = (): void => {
      if (effectiveActions?.onCreateNote) {
        effectiveActions.onCreateNote();
        return;
      }

      // Default fallback: send IPC event to the focused or main window
      const targetWindow = BrowserWindow.getFocusedWindow() ?? WindowManager.getMainWindow();
      if (targetWindow && !targetWindow.isDestroyed() && !targetWindow.webContents.isDestroyed()) {
        targetWindow.webContents.send('menu:create-note');
      }
    };

    const template: MenuItemConstructorOptions[] = [];

    // macOS App Name Menu
    if (isMac) {
      template.push({
        label: app.name,
        submenu: [
          { role: 'about', label: `Tentang ${app.name}` },
          { type: 'separator' },
          { role: 'services', label: 'Layanan' },
          { type: 'separator' },
          { role: 'hide', label: `Sembunyikan ${app.name}` },
          { role: 'hideOthers', label: 'Sembunyikan Lainnya' },
          { role: 'unhide', label: 'Tampilkan Semua' },
          { type: 'separator' },
          { role: 'quit', label: `Keluar dari ${app.name}` },
        ],
      });
    }

    // File Menu (with Catatan Baru)
    template.push({
      label: 'File',
      submenu: [
        {
          label: 'Catatan Baru',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            handleCreateNote();
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Tutup Jendela' } : { role: 'quit', label: 'Keluar' },
      ],
    });

    // Edit Menu
    template.push({
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Batal' },
        { role: 'redo', label: 'Ulangi' },
        { type: 'separator' },
        { role: 'cut', label: 'Potong' },
        { role: 'copy', label: 'Salin' },
        { role: 'paste', label: 'Tempel' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Pilih Semua' },
      ],
    });

    // View Menu
    template.push({
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Muat Ulang' },
        { role: 'forceReload', label: 'Muat Ulang Paksa' },
        { role: 'toggleDevTools', label: 'Alat Pengembang' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh' },
      ],
    });

    // Window Menu
    template.push({
      label: 'Jendela',
      submenu: isMac
        ? [
            { role: 'minimize', label: 'Minimalkan' },
            { role: 'zoom', label: 'Perbesar' },
            { type: 'separator' },
            { role: 'front', label: 'Bawa ke Depan' },
          ]
        : [
            { role: 'minimize', label: 'Minimalkan' },
            { role: 'close', label: 'Tutup' },
          ],
    });

    return template;
  }

  /**
   * Builds and registers the application menu globally.
   */
  static setupApplicationMenu(actions?: ApplicationMenuActions): Menu {
    const template = this.buildApplicationMenuTemplate(actions);
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    return menu;
  }

  /**
   * Constructs a native context menu instance for a note item in the sidebar list.
   * Binds the exact noteId explicitly (PRD US#54-55, Architecture §17 PRD Further Note #4).
   *
   * @param win BrowserWindow initiating the context menu.
   * @param noteId Explicit identifier of the target note clicked.
   * @param actions Optional action overrides for testability or specific handling.
   */
  static buildNoteContextMenu(
    win: BrowserWindow,
    noteId: number,
    actions?: NoteContextMenuActions,
  ): Menu {
    const effectiveActions = actions ?? this.globalContextMenuActions;

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Buka di Jendela Baru',
        click: () => {
          if (effectiveActions?.onOpenInNewWindow) {
            effectiveActions.onOpenInNewWindow(noteId);
          } else {
            WindowManager.createChildWindow(noteId);
          }
        },
      },
      {
        label: 'Hapus',
        click: () => {
          if (effectiveActions?.onDeleteNote) {
            effectiveActions.onDeleteNote(noteId, win);
          } else if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send('notes:request-delete', noteId);
          }
        },
      },
    ];

    return Menu.buildFromTemplate(template);
  }

  /**
   * Displays the note context menu popup on the specified window.
   *
   * @param win Target BrowserWindow to anchor the popup.
   * @param noteId Explicit identifier of the note clicked.
   * @param actions Optional action callbacks.
   */
  static showNoteContextMenu(
    win: BrowserWindow,
    noteId: number,
    actions?: NoteContextMenuActions,
  ): void {
    const menu = this.buildNoteContextMenu(win, noteId, actions);
    menu.popup({ window: win });
  }

  /**
   * Resets internal state for test isolation.
   */
  static resetForTesting(): void {
    this.globalApplicationActions = undefined;
    this.globalContextMenuActions = undefined;
  }
}

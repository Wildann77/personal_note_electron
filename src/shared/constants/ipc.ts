/**
 * Centralized IPC channel definitions to eliminate loose strings
 * and prevent typos across main, preload, and renderer layers.
 */
export const IPC_CHANNELS = {
  // Notes CRUD & Retrieval
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
  NOTES_GET_ALL: 'notes:getAll',
  NOTES_GET_BY_ID: 'notes:getById',

  // Cross-Window Broadcast Event
  NOTES_BROADCAST_CHANGED: 'notes:broadcast-changed',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOWS_OPEN_CHILD: 'windows:openChild',

  // Native Context Menu
  CONTEXT_MENU_SHOW_NOTE: 'context-menu:show-note',

  // Database Backup Trigger
  BACKUP_TRIGGER: 'backup:trigger',

  // Native Menu & Context Menu Action Triggers (Main -> Renderer)
  MENU_CREATE_NOTE: 'menu:create-note',
  NOTES_REQUEST_DELETE: 'notes:request-delete',

  // Update Notification & Download Triggers (Architecture §15.3, TASK [P23-T2], [P23-T3])
  UPDATE_AVAILABLE: 'app:update-available',
  UPDATE_DOWNLOAD: 'app:update-download',
} as const;

/**
 * Type representing any valid IPC channel name.
 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

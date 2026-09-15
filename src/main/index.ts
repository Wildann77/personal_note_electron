import { app } from 'electron';
import { AppLifecycle } from './app/AppLifecycle';
import { registerIpcHandlers } from './ipc';
import { MenuManager } from './infrastructure/menu/MenuManager';
import { applySecurityPolicies } from './app/security';

// Global defense-in-depth: enforce security policies on every browser window created
app.on('browser-window-created', (_, win) => {
  applySecurityPolicies(win);
});

// Final bootstrap orchestration (Architecture §14, TASK P8-T4)
AppLifecycle.bootstrap({
  onReady: () => {
    registerIpcHandlers();
    MenuManager.setupApplicationMenu();
  },
});

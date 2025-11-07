import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/mainWindow';
import { registerIpcHandlers } from './ipc';

/**
 * Application bootstrap entry for the Electron main process.
 *
 * Responsibility of this module is limited to wiring lifecycle hooks and
 * delegating window creation to the window factory. Business logic and IO
 * should live in dedicated modules so that this file remains a thin orchestrator.
 */

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.on('ready', async () => {
  registerIpcHandlers();
  await createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

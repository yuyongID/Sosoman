import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { RunStatusEvent, StartRunPayload } from '../../shared/types/ipc';
import { runEvents } from '../scheduler/pollingService';
import { startRun } from '../services/runService';

/**
 * IPC handler registration.
 *
 * Exporting a configure method keeps tests deterministic and allows lazy
 * initialisation during app boot.
 */
export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.RUNS_START, async (_event, payload: StartRunPayload) => {
    return startRun(payload);
  });

  const forwardRunStatus = (event: RunStatusEvent) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.RUNS_STATUS, event);
      }
    });
  };

  runEvents.on('status', forwardRunStatus);
}

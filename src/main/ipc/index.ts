import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';

/**
 * IPC handler registration.
 *
 * Exporting a configure method keeps tests deterministic and allows lazy
 * initialisation during app boot.
 */
export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.RUNS_START, async (_event, payload) => {
    console.warn('[ipc] RUNS_START invoked without concrete implementation', payload);
    return { runId: 'stubbed-run-id' };
  });
}

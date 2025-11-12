import { contextBridge, ipcRenderer } from 'electron';
import { attachRuntimeEnv } from '../../shared/config/runtimeEnvBridge';
import runtimeEnvConfig from '../../renderer/config/runtimeEnv.json';
import type { RendererBridge, RunStatusEvent } from '../../shared/types/ipc';
import { IPC_CHANNELS } from '../../shared/constants';

const collectProcessEnvOverrides = (): Record<string, string> => {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }
  const allowlistedKeys = new Set(['CI', 'NODE_ENV']);
  const overrides: Record<string, string> = {};
  Object.entries(process.env).forEach(([key, value]) => {
    if (
      value !== undefined &&
      (key.startsWith('SOSOTEST_') || allowlistedKeys.has(key))
    ) {
      overrides[key] = value;
    }
  });
  return overrides;
};

/**
 * Preload script that exposes a curated surface area from the main process to
 * the renderer. By centralising all cross-process interactions we keep the
 * attack surface small and document what capabilities the UI can rely on.
 */

const runtimeEnv = attachRuntimeEnv({
  ...runtimeEnvConfig,
  ...collectProcessEnvOverrides(),
});

contextBridge.exposeInMainWorld('__SOSOMAN_ENV__', runtimeEnv);

const api: RendererBridge = {
  runs: {
    start: async (payload) => ipcRenderer.invoke(IPC_CHANNELS.RUNS_START, payload),
    onStatus: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, status: RunStatusEvent) => {
        listener(status);
      };
      ipcRenderer.on(IPC_CHANNELS.RUNS_STATUS, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.RUNS_STATUS, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('sosoman', api);

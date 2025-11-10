import { contextBridge } from 'electron';
import { attachRuntimeEnv } from '../../shared/config/runtimeEnvBridge';
import runtimeEnvConfig from '../../renderer/config/runtimeEnv.json';
import type { RendererBridge } from '../../shared/types/ipc';

/**
 * Preload script that exposes a curated surface area from the main process to
 * the renderer. By centralising all cross-process interactions we keep the
 * attack surface small and document what capabilities the UI can rely on.
 */

attachRuntimeEnv(runtimeEnvConfig);

const api: RendererBridge = {
  runs: {
    start: async (payload) => {
      // TODO: implement IPC trigger to start a run in the main process.
      console.warn('[preload] runs.start called before implementation', payload);
      return { runId: 'stubbed-run-id' };
    },
    onStatus: (listener) => {
      // TODO: forward events from scheduler module via IPC.
      console.warn('[preload] runs.onStatus invoked without backend wiring');
      return () => {
        console.warn('[preload] runs.onStatus disposer called');
      };
    },
  },
};

contextBridge.exposeInMainWorld('sosoman', api);

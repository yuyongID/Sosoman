/**
 * Types for the IPC bridge exposed through the preload script.
 *
 * Keeping this file within the shared folder allows both main and renderer
 * processes to reason about the IPC contract without circular dependencies.
 */
export interface StartRunPayload {
  flowId: string;
  environmentId: string;
  variables?: Record<string, string>;
}

export interface RunStatusEvent {
  runId: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  updatedAt: string;
}

export interface RendererBridge {
  runs: {
    start: (payload: StartRunPayload) => Promise<{ runId: string }>;
    onStatus: (listener: (event: RunStatusEvent) => void) => () => void;
  };
}

declare global {
  interface Window {
    sosoman: RendererBridge;
  }
}

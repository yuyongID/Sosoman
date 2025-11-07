/**
 * Application level constants shared between main and renderer processes.
 */
export const IPC_CHANNELS = {
  RUNS_START: 'runs:start',
  RUNS_STATUS: 'runs:status',
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'sosoman/token',
  ACTIVE_ENVIRONMENT: 'sosoman/active-environment',
} as const;

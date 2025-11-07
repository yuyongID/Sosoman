/**
 * Lightweight logger facade.
 *
 * Abstracting logging at the entry point makes it easier to swap for
 * structured logging libraries once requirements emerge.
 */
export const logger = {
  info: (message: string, ...meta: unknown[]) => {
    console.info(`[info] ${message}`, ...meta);
  },
  warn: (message: string, ...meta: unknown[]) => {
    console.warn(`[warn] ${message}`, ...meta);
  },
  error: (message: string, ...meta: unknown[]) => {
    console.error(`[error] ${message}`, ...meta);
  },
};

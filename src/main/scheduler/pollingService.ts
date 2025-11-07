import { EventEmitter } from 'events';
import type { RunStatusEvent } from '../../shared/types/ipc';

/**
 * Event-driven polling service that will eventually coordinate background run
 * status checks. For now, it simply exposes an emitter so that other modules
 * can be wired together without concrete implementations.
 */
export const runEvents = new EventEmitter();

export function emitRunStatus(event: RunStatusEvent) {
  runEvents.emit('status', event);
}

export function startRunTracking(runId: string) {
  console.warn('[scheduler] startRunTracking not yet implemented', runId);
}

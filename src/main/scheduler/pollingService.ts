import { EventEmitter } from 'events';
import { fetchRunStatus } from '../../api/runs';
import type { RunStatusEvent } from '../../shared/types/ipc';
import { logger } from '../../utils/logger';

const POLL_INTERVAL_MS = 2_000;
const FINAL_STATUSES = new Set<RunStatusEvent['status']>(['passed', 'failed']);
const pollTimers = new Map<string, NodeJS.Timeout>();

export const runEvents = new EventEmitter();

export function emitRunStatus(event: RunStatusEvent) {
  runEvents.emit('status', event);
  if (FINAL_STATUSES.has(event.status)) {
    stopRunTracking(event.runId);
  }
}

export function startRunTracking(runId: string, intervalMs = POLL_INTERVAL_MS) {
  if (!runId || pollTimers.has(runId)) {
    return;
  }

  const scheduleNext = (delay: number) => {
    const timer = setTimeout(() => {
      void poll();
    }, delay);
    pollTimers.set(runId, timer);
  };

  const poll = async () => {
    try {
      const snapshot = await fetchRunStatus(runId);
      emitRunStatus(snapshot);
      if (!FINAL_STATUSES.has(snapshot.status)) {
        scheduleNext(intervalMs);
      }
    } catch (error) {
      logger.warn('[scheduler] Failed to poll run status', error);
      scheduleNext(intervalMs * 2);
    }
  };

  scheduleNext(intervalMs);
}

export function stopRunTracking(runId: string) {
  const timer = pollTimers.get(runId);
  if (timer) {
    clearTimeout(timer);
    pollTimers.delete(runId);
  }
}

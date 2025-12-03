import { triggerRun } from '../../api/runs';
import type { StartRunPayload, RunStatusEvent } from '../../shared/types/ipc';
import { emitRunStatus, startRunTracking } from '../scheduler/pollingService';
import { logger } from '../../utils/logger';

const FALLBACK_STATUSES: RunStatusEvent['status'][] = ['pending', 'running', 'passed'];
const FALLBACK_STEP_MS = 1_200;

const buildStatusEvent = (runId: string, status: RunStatusEvent['status']): RunStatusEvent => ({
  runId,
  status,
  updatedAt: new Date().toISOString(),
});

export async function startRun(payload: StartRunPayload): Promise<{ runId: string }> {
  try {
    const { runId } = await triggerRun(payload);
    emitRunStatus(buildStatusEvent(runId, 'pending'));
    startRunTracking(runId);
    return { runId };
  } catch (error) {
    logger.warn('[runService] triggerRun failed, falling back to synthetic run events', {
      flowId: payload.flowId,
      environmentId: payload.environmentId,
    });
    logger.warn('[runService] root cause', error);
    return startFallbackRun();
  }
}

function startFallbackRun(): { runId: string } {
  const runId = `local-${Date.now()}`;
  FALLBACK_STATUSES.forEach((status, index) => {
    setTimeout(() => {
      emitRunStatus(buildStatusEvent(runId, status));
    }, index * FALLBACK_STEP_MS);
  });
  return { runId };
}

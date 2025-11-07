import { apiClient } from './client';
import type { RunStatusEvent } from '../shared/types/ipc';

type TriggerRunPayload = {
  flowId: string;
  environmentId: string;
  variables?: Record<string, string>;
};

type TriggerRunResponse = {
  runId: string;
};

/**
 * Execution related operations.
 */
export async function triggerRun(payload: TriggerRunPayload): Promise<TriggerRunResponse> {
  const { data } = await apiClient.post<TriggerRunResponse>('/runs', payload);
  return data;
}

export async function fetchRunStatus(runId: string): Promise<RunStatusEvent> {
  const { data } = await apiClient.get<RunStatusEvent>(`/runs/${runId}`);
  return data;
}

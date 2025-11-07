import { apiClient } from './client';
import type { TestFlow } from '../shared/models/testFlow';

/**
 * API surface for flow composition.
 */
export async function listTestFlows(): Promise<TestFlow[]> {
  const { data } = await apiClient.get<TestFlow[]>('/flows');
  return data;
}

export async function saveTestFlow(payload: TestFlow): Promise<TestFlow> {
  const { data } = await apiClient.post<TestFlow>('/flows', payload);
  return data;
}

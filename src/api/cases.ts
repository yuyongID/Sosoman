import { apiClient } from './client';
import type { TestCase } from '../shared/models/testCase';

/**
 * CRUD operations for individual test cases.
 */
export async function listTestCases(): Promise<TestCase[]> {
  const { data } = await apiClient.get<TestCase[]>('/cases');
  return data;
}

export async function createTestCase(payload: TestCase): Promise<TestCase> {
  const { data } = await apiClient.post<TestCase>('/cases', payload);
  return data;
}

export async function updateTestCase(id: string, payload: Partial<TestCase>): Promise<TestCase> {
  const { data } = await apiClient.put<TestCase>(`/cases/${id}`, payload);
  return data;
}

export async function deleteTestCase(id: string): Promise<void> {
  await apiClient.delete(`/cases/${id}`);
}

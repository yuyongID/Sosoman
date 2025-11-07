/**
 * Test case representation following README guidelines.
 */
export interface TestCase {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  expect: {
    status?: number;
    bodyContains?: string;
    responseTimeMs?: number;
  };
  createdAt: string;
  updatedAt: string;
}

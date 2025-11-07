/**
 * Shared models describing API collections and request definitions.
 *
 * The renderer consumes these types directly while the API layer can reuse the
 * same contracts to keep clients/mock data interchangeable.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiTestSnippet {
  id: string;
  name: string;
  script: string;
}

export interface ApiRequestDefinition {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  description?: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: string;
  tests: ApiTestSnippet[];
  preScript?: string;
  postScript?: string;
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  requests: ApiRequestDefinition[];
}

export interface ApiResponseSnapshot {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  durationMs: number;
  sizeInBytes: number;
  headers: KeyValuePair[];
  body: string;
  consoleLog: string[];
  startedAt: string;
  finishedAt: string;
}

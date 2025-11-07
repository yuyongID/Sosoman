import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
} from '@shared/models/apiCollection';
import { apiClient } from './client';
import { MockApiCollectionsClient } from './mocks/apiCollectionsMock';

export interface ExecuteRequestPayload {
  request: ApiRequestDefinition;
}

export interface ApiCollectionsClient {
  listCollections(): Promise<ApiCollection[]>;
  executeRequest(payload: ExecuteRequestPayload): Promise<ApiResponseSnapshot>;
}

class HttpApiCollectionsClient implements ApiCollectionsClient {
  async listCollections(): Promise<ApiCollection[]> {
    const { data } = await apiClient.get<ApiCollection[]>('/collections');
    return data;
  }

  async executeRequest(payload: ExecuteRequestPayload): Promise<ApiResponseSnapshot> {
    const { data } = await apiClient.post<ApiResponseSnapshot>('/collections/execute', payload);
    return data;
  }
}

let activeClient: ApiCollectionsClient = new MockApiCollectionsClient();

/**
 * Allows callers (tests or future bootstrapping code) to replace the underlying
 * client without touching feature modules.
 */
export function configureApiCollectionsClient(client: ApiCollectionsClient): void {
  activeClient = client;
}

export function useHttpApiCollectionsClient(): void {
  activeClient = new HttpApiCollectionsClient();
}

export function listApiCollections(): Promise<ApiCollection[]> {
  return activeClient.listCollections();
}

export function executeApiRequest(payload: ExecuteRequestPayload): Promise<ApiResponseSnapshot> {
  return activeClient.executeRequest(payload);
}

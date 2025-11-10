import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
} from '@shared/models/apiCollection';

export interface RequestTabState {
  id: string;
  collectionId: string;
  collectionName: string;
  requestId: string;
  title: string;
  baselineSignature: string;
  request: ApiRequestDefinition;
  draft: ApiRequestDefinition;
  response?: ApiResponseSnapshot;
  isDirty: boolean;
  isRunning: boolean;
  lastRunAt?: string;
}

/**
 * Lightweight serialisation to detect dirty drafts without deep-compare helpers.
 */
export const serializeRequest = (request: ApiRequestDefinition): string => JSON.stringify(request);

/**
 * Ensures request objects stay immutable between the API layer and UI state.
 */
export const cloneRequest = (request: ApiRequestDefinition): ApiRequestDefinition =>
  JSON.parse(JSON.stringify(request));

export const buildTabId = (collectionId: string, requestId: string): string =>
  `${collectionId}:${requestId}`;

export const createTabState = (collection: ApiCollection, request: ApiRequestDefinition): RequestTabState => {
  const requestClone = cloneRequest(request);
  return {
    id: buildTabId(collection.id, request.id),
    collectionId: collection.id,
    collectionName: collection.name,
    requestId: request.id,
    title: request.name,
    baselineSignature: serializeRequest(requestClone),
    request: requestClone,
    draft: cloneRequest(requestClone),
    response: undefined,
    isDirty: false,
    isRunning: false,
  };
};

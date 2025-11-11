import type {
  ApiCollection,
  ApiRequestDefinition,
  HttpMethod,
  KeyValuePair,
} from '@shared/models/apiCollection';
import type { SosotestInterfaceData, SosotestInterfaceItem } from '@api/sosotest/interfaces';

export const DEFAULT_COLLECTION_ID = 'sosotest';

export const createBaseCollection = (): ApiCollection => ({
  id: DEFAULT_COLLECTION_ID,
  name: 'Sosotest APIs',
  description: 'Interfaces synchronized from sosotest backend',
  tags: ['sosotest'],
  requests: [],
});

const allowedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const normalizeHttpMethod = (method?: string): HttpMethod => {
  const upper = (method ?? 'GET').toUpperCase();
  return (allowedMethods.includes(upper as HttpMethod) ? upper : 'GET') as HttpMethod;
};

const safeJsonParse = <T,>(raw: string | null | undefined): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('[apiCollections] Failed to parse JSON field from sosotest payload');
    return null;
  }
};

const toDisplayValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const recordToPairs = (record: Record<string, unknown>, prefix: string): KeyValuePair[] =>
  Object.entries(record).map(([key, value], index) => ({
    id: `${prefix}-${index}-${key}`,
    key,
    value: toDisplayValue(value),
    enabled: true,
  }));

const parseHeadersFromSosotest = (raw: string | null | undefined): KeyValuePair[] => {
  const parsed = safeJsonParse<Record<string, unknown>>(raw);
  if (!parsed) {
    return [];
  }
  return recordToPairs(parsed, 'header');
};

const parseParamsFromSosotest = (raw: string | null | undefined): KeyValuePair[] => {
  if (!raw) {
    return [];
  }
  const params = new URLSearchParams(raw);
  const pairs: KeyValuePair[] = [];
  params.forEach((value, key) => {
    pairs.push({
      id: `param-${pairs.length}-${key}`,
      key,
      value,
      enabled: true,
    });
  });
  return pairs;
};

const adaptSosotestLikeToRequest = (
  item: SosotestInterfaceItem | SosotestInterfaceData
): ApiRequestDefinition => ({
  id: String(item.id ?? item.interfaceId),
  name: item.title ?? 'Untitled request',
  method: normalizeHttpMethod(item.method),
  url: item.url || '/',
  description: item.casedesc ?? '',
  params: parseParamsFromSosotest(item.params),
  headers: parseHeadersFromSosotest(item.header),
  body: item.bodyContent ?? '',
  tests: [],
  preScript: item.varsPre ?? '',
  postScript: item.varsPost ?? '',
});

export const adaptInterfaceItemToRequest = (item: SosotestInterfaceItem): ApiRequestDefinition =>
  adaptSosotestLikeToRequest(item);

export const adaptInterfaceDataToRequest = (data: SosotestInterfaceData): ApiRequestDefinition =>
  adaptSosotestLikeToRequest(data);

const enabledPairsToRecord = (pairs: KeyValuePair[]): Record<string, string> =>
  pairs
    .filter((pair) => pair.enabled && pair.key)
    .reduce<Record<string, string>>((acc, pair) => {
      acc[pair.key] = pair.value;
      return acc;
    }, {});

const enabledPairsToQueryString = (pairs: KeyValuePair[]): string => {
  const searchParams = new URLSearchParams();
  pairs
    .filter((pair) => pair.enabled && pair.key)
    .forEach((pair) => {
      searchParams.append(pair.key, pair.value);
    });
  return searchParams.toString();
};

const ALLOWED_INTERFACE_FIELDS: (keyof SosotestInterfaceData)[] = [
  'createSourceId',
  'title',
  'casedesc',
  'useCustomUri',
  'customUri',
  'uri',
  'url',
  'method',
  'urlRedirect',
  'timeout',
  'performanceTime',
  'params',
  'header',
  'bodyContent',
  'bodyType',
  'varsPre',
  'varsPost',
  'isAsync',
  'id',
  'interfaceId',
  'httpConfKey',
];

const sanitizeInterfaceData = (data: SosotestInterfaceData): SosotestInterfaceData => {
  const picked = {} as SosotestInterfaceData;
  ALLOWED_INTERFACE_FIELDS.forEach((field) => {
    if (field in data) {
      (picked as Record<string, unknown>)[field] = data[field];
    }
  });
  return picked;
};

const buildUpdatedInterfaceData = (
  prevData: SosotestInterfaceData,
  request: ApiRequestDefinition
): SosotestInterfaceData => ({
  ...prevData,
  method: request.method,
  url: request.url,
  params: enabledPairsToQueryString(request.params),
  header: JSON.stringify(enabledPairsToRecord(request.headers)),
  bodyContent: request.body,
  varsPre: request.preScript ?? '',
  varsPost: request.postScript ?? '',
});

export const applyRequestOntoInterfaceData = (
  prevData: SosotestInterfaceData,
  request: ApiRequestDefinition
): SosotestInterfaceData => sanitizeInterfaceData(buildUpdatedInterfaceData(prevData, request));

export const mergeRequests = (
  existing: ApiRequestDefinition[],
  next: ApiRequestDefinition[]
): ApiRequestDefinition[] => {
  if (existing.length === 0) {
    return next;
  }
  const merged = [...existing];
  next.forEach((request) => {
    const index = merged.findIndex((item) => item.id === request.id);
    if (index >= 0) {
      merged[index] = request;
    } else {
      merged.push(request);
    }
  });
  return merged;
};

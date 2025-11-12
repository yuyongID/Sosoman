import type {
  SosotestInterfaceData,
  SosotestInterfaceItem,
  SosotestInterfaceListRequest,
  SosotestInterfaceListResult,
  SosotestInterfaceSaveResponse,
  SaveSosotestInterfacePayload,
} from '@api/sosotest/interfaces';
import type { SosotestEnvironmentEntry } from '@api/sosotest/environments';
import type {
  ApiResponseSnapshot,
  KeyValuePair,
} from '@shared/models/apiCollection';
import type {
  ExecuteSosotestDebugRequestOptions,
  ExecuteSosotestDebugRequestPayload,
} from '../debug';
import { debugBody, environmentGroups, interfaceList } from './fixtures';

type InterfaceId = number;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const inMemoryInterfaces = new Map<InterfaceId, SosotestInterfaceData>(
  interfaceList.map((record) => [record.id, deepClone(record)])
);

const toListResult = (
  items: SosotestInterfaceItem[]
): SosotestInterfaceListResult => ({
  items,
  response: {
    code: 10000,
    message: 'ok',
    body: {
      data: items,
    },
  },
});

const paginate = <T>(source: T[], page: number, limit: number): T[] => {
  if (limit <= 0) {
    return [];
  }
  const start = Math.max(0, (page - 1) * limit);
  return source.slice(start, start + limit);
};

const buildHeadersFromRaw = (raw?: string | Record<string, unknown>): KeyValuePair[] => {
  if (!raw) {
    return [
      {
        id: 'content-type',
        key: 'Content-Type',
        value: 'application/json',
        enabled: true,
      },
    ];
  }
  const parsed =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return { 'x-mock-header': raw };
          }
        })()
      : raw;
  return Object.entries(parsed).map(([key, value], index) => ({
    id: `${key}-${index}`,
    key,
    value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
    enabled: true,
  }));
};

const abortGuard = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    const error =
      typeof DOMException !== 'undefined'
        ? new DOMException('Aborted', 'AbortError')
        : Object.assign(new Error('Aborted'), { name: 'AbortError' });
    throw error;
  }
};

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    abortGuard(signal);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(
        typeof DOMException !== 'undefined'
          ? new DOMException('Aborted', 'AbortError')
          : Object.assign(new Error('Aborted'), { name: 'AbortError' })
      );
    };
    signal?.addEventListener('abort', onAbort);
  });

const pickInterface = (id: number | string): SosotestInterfaceData | undefined => {
  const numericId = typeof id === 'string' ? Number(id) : id;
  if (Number.isFinite(numericId)) {
    const record = inMemoryInterfaces.get(Number(numericId));
    return record ? deepClone(record) : undefined;
  }
  return undefined;
};

const makeSnapshot = (
  payload: ExecuteSosotestDebugRequestPayload,
  consoleLog: string[],
  startedAt: string,
  finishedAt: string
): ApiResponseSnapshot => {
  const responseBody = debugBody.respBodyText ?? '{"code":2000,"message":"OK"}';
  return {
    id: `mock-sosotest-${payload.requestId}-${Date.now()}`,
    requestId: payload.requestId,
    status: 200,
    statusText: 'OK',
    durationMs: Math.max(
      0,
      new Date(finishedAt).getTime() - new Date(startedAt).getTime()
    ),
    sizeInBytes: new TextEncoder().encode(responseBody).length,
    headers: buildHeadersFromRaw(debugBody.header),
    body: responseBody,
    consoleLog: [...consoleLog],
    startedAt,
    finishedAt,
    sosotestBody: debugBody,
  };
};

export const sosotestMockService = {
  async fetchInterfaceList(
    params: SosotestInterfaceListRequest
  ): Promise<SosotestInterfaceListResult> {
    const allItems = Array.from(inMemoryInterfaces.values()).sort(
      (a, b) => Number(b.id) - Number(a.id)
    );
    const paged = paginate(allItems, params.page, params.limit);
    const items = paged.map((item) => ({ ...item }));
    return toListResult(items);
  },

  async fetchInterfaceDetail(id: number | string): Promise<SosotestInterfaceData> {
    const record = pickInterface(id);
    if (!record) {
      throw new Error('Mock 模式下未找到对应的 sosotest 接口');
    }
    return deepClone(record);
  },

  async saveInterface(
    payload: SaveSosotestInterfacePayload
  ): Promise<SosotestInterfaceSaveResponse> {
    const source = payload.interfaceData;
    const resolvedId =
      (typeof source.id === 'number' && source.id) ||
      (typeof payload.id === 'number' && payload.id) ||
      Number(payload.id) ||
      Date.now();
    const normalizedId = Number(resolvedId);
    const existing = pickInterface(normalizedId);
    const nextRecord: SosotestInterfaceData = {
      ...existing,
      ...source,
      id: normalizedId,
      modTime: new Date().toISOString(),
    };
    inMemoryInterfaces.set(normalizedId, deepClone(nextRecord));
    return {
      code: 10000,
      message: 'ok',
      body: { id: normalizedId },
    };
  },

  async fetchEnvironmentList(uriKey: string): Promise<SosotestEnvironmentEntry[]> {
    if (!uriKey) {
      return [];
    }
    const flatten = [
      ...(environmentGroups.test_group ?? []),
      ...(environmentGroups.online_group ?? []),
      ...(environmentGroups.local_group ?? []),
    ];
    return flatten
      .filter((entry) => entry.uriKey === uriKey)
      .map((entry) => ({ ...entry }));
  },

  async executeDebugRequest(
    payload: ExecuteSosotestDebugRequestPayload,
    options: ExecuteSosotestDebugRequestOptions = {}
  ): Promise<ApiResponseSnapshot> {
    const startedAt = new Date().toISOString();
    const consoleLog = [
      `Mock 调试任务已发起：${payload.interfaceData.title ?? payload.interfaceData.id}`,
    ];
    await delay(120, options.signal);
    consoleLog.push('Mock 轮询第 1 次：10000 OK');
    const finishedAt = new Date().toISOString();
    const snapshot = makeSnapshot(payload, consoleLog, startedAt, finishedAt);
    options.onSnapshot?.(snapshot);
    return snapshot;
  },
};

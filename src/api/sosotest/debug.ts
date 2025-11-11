import type { AxiosResponse } from 'axios';
import type { ApiResponseSnapshot, KeyValuePair, SosotestDebugBody } from '@shared/models/apiCollection';
import type { SosotestInterfaceData } from '@api/sosotest/interfaces';
import { DEFAULT_SOSOTEST_PLAN_ID, sosotestClient } from '@api/sosotest/interfaces';

const RUN_PATH = '/v2/http/interface/debug';
const RESULT_PATH = '/v2/http/interface/result';
const DEFAULT_POLL_INTERVAL_MS = 1200;
const DEFAULT_POLL_ATTEMPTS = 18;

interface SosotestRunDebugResponse {
  code: number;
  message: string;
  body?: string;
}

interface SosotestRunResultResponse {
  code: number;
  message: string;
  body?: unknown;
}

export interface ExecuteSosotestDebugRequestPayload {
  requestId: string;
  interfaceData: SosotestInterfaceData;
  planId?: number;
}

export interface ExecuteSosotestDebugRequestOptions {
  onSnapshot?: (snapshot: ApiResponseSnapshot) => void;
  pollIntervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}

const createAbortError = (): Error => {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError');
  }
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };
    signal?.addEventListener('abort', onAbort);
  });

const normalizeHeaderValue = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');

const toHeaderPairs = (headers: AxiosResponse<unknown>['headers']): KeyValuePair[] =>
  Object.entries(headers ?? {}).map(([key, value], index) => ({
    id: `${key}-${index}-${normalizeHeaderValue(value)}`,
    key,
    value: normalizeHeaderValue(value),
    enabled: true,
  }));

const formatResponseBody = (response: AxiosResponse<unknown>): string => {
  const raw = response.data;
  if (typeof raw === 'string') {
    return raw;
  }
  try {
    return JSON.stringify(raw ?? null, null, 2);
  } catch {
    return String(raw ?? '');
  }
};

const buildSnapshot = (
  response: AxiosResponse<unknown>,
  requestId: string,
  consoleLog: string[],
  startedAt: string,
  finishedAt: string,
  displayBody: string,
  sosotestBody?: SosotestDebugBody
): ApiResponseSnapshot => {
  const durationMs = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  );
  const sizeInBytes = new TextEncoder().encode(displayBody).length;
  return {
    id: `sosotest-${requestId}-${Date.now()}`,
    requestId,
    status: response.status,
    statusText: response.statusText ?? '',
    durationMs,
    sizeInBytes,
    headers: toHeaderPairs(response.headers),
    body: displayBody,
    consoleLog: [...consoleLog],
    startedAt,
    finishedAt,
    sosotestBody,
  };
};

const runSosotestInterface = async (
  interfaceData: SosotestInterfaceData,
  planId: number,
  signal?: AbortSignal
): Promise<string> => {
  const formData = new FormData();
  formData.append('interfaceData', JSON.stringify(interfaceData));
  formData.append('ketest_plan_id', String(planId));
  const { data } = await sosotestClient.post<SosotestRunDebugResponse>(RUN_PATH, formData, {
    signal,
  });
  const debugId = data.body;
  if (!debugId) {
    throw new Error('[sosotest] 调试接口未返回调试 ID');
  }
  console.info('[sosotest] Debug 请求已提交', {
    interfaceId: interfaceData.interfaceId ?? interfaceData.id,
    planId,
    debugId,
  });
  return debugId;
};

const pollSosotestResult = (
  debugId: string,
  signal?: AbortSignal
): Promise<AxiosResponse<SosotestRunResultResponse>> =>
  sosotestClient.get<SosotestRunResultResponse>(RESULT_PATH, {
    params: {
      test_debug_id: debugId,
    },
    signal,
  });

export async function executeSosotestDebugRequest(
  payload: ExecuteSosotestDebugRequestPayload,
  options: ExecuteSosotestDebugRequestOptions = {}
): Promise<ApiResponseSnapshot> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_POLL_ATTEMPTS;
  const planId = payload.planId ?? DEFAULT_SOSOTEST_PLAN_ID;
  const consoleLog: string[] = [];
  const startedAt = new Date().toISOString();
  const signal = options.signal;

  const debugId = await runSosotestInterface(payload.interfaceData, planId, signal);
  consoleLog.push(`调试任务已发起，调试编号 ${debugId}`);

  let lastSnapshot: ApiResponseSnapshot | null = null;
  let lastCode: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await pollSosotestResult(debugId, signal);
    const finishedAt = new Date().toISOString();
    const code = response.data?.code;
    const message = response.data?.message ?? '';
    consoleLog.push(`轮询第 ${attempt} 次：${code} ${message}`);

    const debugBody = response.data?.body as SosotestDebugBody | undefined;
    const displayBody = debugBody?.respBodyText ?? formatResponseBody(response);
    const snapshot = buildSnapshot(
      response,
      payload.requestId,
      consoleLog,
      startedAt,
      finishedAt,
      displayBody,
      debugBody
    );
    options.onSnapshot?.(snapshot);
    lastSnapshot = snapshot;
    lastCode = code;

    if (code === 10000) {
      console.info('[sosotest] 轮询完成', { debugId, attempts: attempt });
      const payloadToLog = debugBody ?? response.data;
      consoleLog.push(JSON.stringify(payloadToLog ?? {}, null, 2));
      break;
    }

    if (attempt < maxAttempts) {
      await wait(pollIntervalMs, signal);
    }
  }

  if (!lastSnapshot) {
    throw new Error('[sosotest] 未能获取轮询结果，请稍后重试');
  }

  if (lastCode !== 10000) {
    const warning = `轮询 ${maxAttempts} 次仍未完成，最后返回 code ${lastCode}`;
    console.warn('[sosotest]', warning);
    consoleLog.push(warning);
    lastSnapshot = { ...lastSnapshot, consoleLog: [...consoleLog] };
  }

  return lastSnapshot;
}

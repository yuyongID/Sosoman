import axios from 'axios';
import { getEnvValue } from '../client';
import { isSosotestMockEnabled } from './config';
import { sosotestMockService } from './mock/service';

const DEFAULT_BASE_URL = 'https://at.api.ke.com';

const sosotestBaseUrl =
  getEnvValue('SOSOTEST_INTERFACE_BASE_URL') ??
  getEnvValue('SOSOTEST_BASE_URL') ??
  DEFAULT_BASE_URL;

const sosotestClient = axios.create({
  baseURL: sosotestBaseUrl,
  timeout: 15_000,
});

const parseFilterFromEnv = (): SosotestInterfaceFilter[] | undefined => {
  const raw = getEnvValue('SOSOTEST_INTERFACE_FILTER');
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SosotestInterfaceFilter[]) : undefined;
  } catch (error) {
    console.warn('[sosotest] Failed to parse SOSOTEST_INTERFACE_FILTER', error);
    return undefined;
  }
};

const parsePlanIdFromEnv = (): number | undefined => {
  const raw = getEnvValue('SOSOTEST_INTERFACE_PLAN_ID');
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  console.warn('[sosotest] Invalid SOSOTEST_INTERFACE_PLAN_ID value', raw);
  return undefined;
};

export const DEFAULT_SOSOTEST_PLAN_ID = parsePlanIdFromEnv() ?? 0;

const truncate = (value: string, max = 400): string =>
  value.length > max ? `${value.slice(0, max)}…(+${value.length - max} chars)` : value;

interface FormDataEntrySummary {
  type: 'text' | 'binary';
  value?: string;
  length?: number;
}

const summarizePayload = (data: unknown): Record<string, unknown> => {
  if (!data) {
    return { payloadType: 'none' };
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const entries: Record<string, FormDataEntrySummary> = {};
    data.forEach((value, key) => {
      if (typeof value === 'string') {
        entries[key] = {
          type: 'text',
          value,
          length: value.length,
        };
      } else {
        entries[key] = { type: 'binary' };
      }
    });
    return {
      payloadType: 'form-data',
      fieldCount: Object.keys(entries).length,
      entries,
    };
  }
  if (typeof data === 'string') {
    return {
      payloadType: 'string',
      length: data.length,
      preview: truncate(data, 4000),
      value: data.length <= 4000 ? data : undefined,
    };
  }
  if (typeof data === 'object') {
    const jsonSnapshot = JSON.stringify(data);
    return {
      payloadType: 'json',
      keys: Object.keys(data as Record<string, unknown>),
      preview: truncate(jsonSnapshot, 4000),
      value: jsonSnapshot.length <= 4000 ? jsonSnapshot : undefined,
    };
  }
  return { payloadType: typeof data, value: data };
};

sosotestClient.interceptors.request.use((config) => {
  const headers = config.headers ?? {};
  const token = getEnvValue('SOSOTEST_TOKEN');
  const authEmail = getEnvValue('SOSOTEST_AUTH_EMAIL');
  const userEmail = getEnvValue('SOSOTEST_USER_EMAIL');

  if (token) {
    headers.token = token;
  }
  if (authEmail) {
    headers['auth-email'] = authEmail;
  }
  if (userEmail) {
    headers['user-email'] = userEmail;
  }
  config.headers = headers;

  const payloadSummary = summarizePayload(config.data);
  const resolvedBase = config.baseURL ?? sosotestBaseUrl;
  const resolvedUrl =
    config.url && resolvedBase ? new URL(config.url, resolvedBase).toString() : config.url ?? '';
  const paramsSnapshot =
    typeof config.params === 'object'
      ? truncate(JSON.stringify(config.params), 400)
      : config.params ?? '';

  return config;
});

sosotestClient.interceptors.response.use(
  (response) => {
    const items = response.data?.body?.data ?? [];
    return response;
  },
  (error) => {
    const { response } = error;
    if (response) {
      console.error(
        '[sosotest] × %s %s -> %s %s',
        response.config?.method?.toUpperCase() ?? 'POST',
        response.config?.url ?? '',
        response.status,
        response.statusText
      );
      console.error('[sosotest] Response body snapshot:', response.data);
    } else {
      console.error('[sosotest] × Network/transport error', error.message);
    }
    return Promise.reject(error);
  }
);

export interface SosotestInterfaceFilter {
  key: string;
  value: unknown;
  type?: string;
  rule?: string;
}

export interface SosotestInterfaceListRequest {
  page: number;
  limit: number;
  planId?: number;
  filter?: SosotestInterfaceFilter[];
}

export interface SosotestInterfaceItem {
  id: number;
  interfaceId: string;
  title: string;
  casedesc?: string;
  url: string;
  uri?: string;
  method: string;
  header?: string;
  params?: string;
  bodyContent?: string;
  bodyType?: string;
  varsPre?: string;
  varsPost?: string;
  [key: string]: unknown;
}

export interface SosotestInterfaceData {
  id: number;
  interfaceId: string;
  title: string;
  casedesc?: string;
  businessLineId?: number;
  moduleId?: number;
  sourceId?: number;
  createSourceId?: number;
  autoStrategyId?: number;
  caselevel?: number;
  status?: number;
  caseType?: number;
  urlRedirect?: number;
  useCustomUri?: number;
  customUri?: string;
  varsPre?: string;
  uri?: string;
  method: string;
  header?: string;
  url: string;
  params?: string;
  bodyType?: string;
  bodyContent?: string;
  timeout?: number;
  varsPost?: string;
  performanceTime?: number;
  state?: number;
  addBy?: string;
  modBy?: string;
  httpConfKey?: string;
  [key: string]: unknown;
}

export interface SosotestInterfaceListResponse {
  code: number;
  message: string;
  body?: {
    data?: SosotestInterfaceItem[];
  };
}

export interface SosotestInterfaceListResult {
  items: SosotestInterfaceItem[];
  response: SosotestInterfaceListResponse;
}

export interface SosotestInterfaceDetailResponse {
  code: number;
  message: string;
  body?: {
    interface_data?: SosotestInterfaceData;
  };
}

export interface SosotestInterfaceSaveResponse {
  code: number;
  message: string;
  body?: Record<string, unknown>;
}

export interface SaveSosotestInterfacePayload {
  id: number | string;
  interfaceData: SosotestInterfaceData;
}

export async function fetchSosotestInterfaceList(
  params: SosotestInterfaceListRequest
): Promise<SosotestInterfaceListResult> {
  if (isSosotestMockEnabled) {
    return sosotestMockService.fetchInterfaceList(params);
  }
  const envFilter = parseFilterFromEnv();
  const resolvedFilter =
    params.filter ?? envFilter ?? ([] as SosotestInterfaceFilter[]);
  const resolvedPlanId = params.planId ?? DEFAULT_SOSOTEST_PLAN_ID;
  const payload = {
    page: params.page,
    limit: params.limit,
    filter: resolvedFilter,
    plan_id: resolvedPlanId,
  };
  const { data } = await sosotestClient.post<SosotestInterfaceListResponse>(
    '/v2/http/interface/list',
    payload
  );
  return {
    items: data.body?.data ?? [],
    response: data,
  };
}

export async function fetchSosotestInterfaceDetail(
  id: number | string
): Promise<SosotestInterfaceData> {
  if (isSosotestMockEnabled) {
    return sosotestMockService.fetchInterfaceDetail(id);
  }
  const { data } = await sosotestClient.get<SosotestInterfaceDetailResponse>(
    '/v2/http/interface/get',
    {
      params: { id },
    }
  );
  const detail = data.body?.interface_data;
  if (!detail) {
    throw new Error('接口详情不存在或返回格式不正确');
  }
  return detail;
}

export async function saveSosotestInterface(
  payload: SaveSosotestInterfacePayload
): Promise<SosotestInterfaceSaveResponse> {
  if (isSosotestMockEnabled) {
    return sosotestMockService.saveInterface(payload);
  }
  const formData = new FormData();
  formData.append('interfaceData', JSON.stringify(payload.interfaceData));
  formData.append('id', String(payload.id));
  const { data } = await sosotestClient.post<SosotestInterfaceSaveResponse>(
    '/v2/http/interface/edit',
    formData
  );
  if (data.code !== 10000) {
    const message = data.message ?? '未知错误';
    console.error('[sosotest] Interface save failed', { code: data.code, message, body: data.body });
    throw new Error(`sosotest 保存失败：${message}`);
  }
  return data;
}

export { sosotestClient };

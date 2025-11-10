import axios from 'axios';
import { getEnvValue } from '../client';

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

const defaultFilter = parseFilterFromEnv();
const defaultPlanId = parsePlanIdFromEnv() ?? 0;

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

  const payloadSummary =
    typeof config.data === 'object'
      ? {
          page: (config.data as SosotestInterfaceListRequest)?.page,
          limit: (config.data as SosotestInterfaceListRequest)?.limit,
          plan_id: (config.data as { plan_id?: number })?.plan_id,
          filterSize: Array.isArray((config.data as { filter?: unknown[] }).filter)
            ? ((config.data as { filter?: unknown[] }).filter?.length ?? 0)
            : 0,
        }
      : { payloadType: typeof config.data };

  console.info('[sosotest] → %s %s', (config.method ?? 'post').toUpperCase(), config.url ?? '', {
    baseURL: config.baseURL ?? sosotestBaseUrl,
    payload: payloadSummary,
    hasToken: Boolean(token),
    authEmail,
    userEmail,
  });

  return config;
});

sosotestClient.interceptors.response.use(
  (response) => {
    const items = response.data?.body?.data ?? [];
    console.info('[sosotest] ← %s %s', response.config.method?.toUpperCase() ?? 'POST', response.config.url ?? '', {
      status: response.status,
      items: items.length,
    });
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

export async function fetchSosotestInterfaceList(
  params: SosotestInterfaceListRequest
): Promise<SosotestInterfaceListResult> {
  const resolvedFilter =
    params.filter ?? defaultFilter ?? ([] as SosotestInterfaceFilter[]);
  const resolvedPlanId = params.planId ?? defaultPlanId;
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

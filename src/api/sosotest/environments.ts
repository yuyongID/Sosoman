import type { AxiosResponse } from 'axios';
import { sosotestClient } from '@api/sosotest/interfaces';

export type SosotestEnvironmentGroupType = 'online' | 'test' | 'local';

export interface SosotestEnvironmentEntry {
  addrEnvType?: number;
  env_key?: string;
  env_id?: number;
  env_name?: string;
  httpConfKey: string;
  id?: number;
  requestAddr?: string;
  state?: number;
  uriKey?: string;
  groupType?: SosotestEnvironmentGroupType;
  [key: string]: unknown;
}

export interface SosotestEnvironmentListResponseBody {
  online_group?: SosotestEnvironmentEntry[];
  test_group?: SosotestEnvironmentEntry[];
  local_group?: SosotestEnvironmentEntry[];
}

export interface SosotestEnvironmentListResponse {
  code: number;
  message: string;
  body?: SosotestEnvironmentListResponseBody;
}

const ENVIRONMENT_PATH = '/v2/config/uri/group_env';

const flattenGroups = (body?: SosotestEnvironmentListResponseBody): SosotestEnvironmentEntry[] => {
  if (!body) {
    return [];
  }
  return [
    ...(body.test_group ?? []).map((entry) => ({ ...entry, groupType: 'test' as const })),
    ...(body.online_group ?? []).map((entry) => ({ ...entry, groupType: 'online' as const })),
    ...(body.local_group ?? []).map((entry) => ({ ...entry, groupType: 'local' as const })),
  ];
};

export async function fetchSosotestEnvironmentList(
  uriKey: string
): Promise<SosotestEnvironmentEntry[]> {
  if (!uriKey) {
    console.warn('[sosotest] Missing uri key for environment list');
    return [];
  }
  const { data } = await sosotestClient.get<SosotestEnvironmentListResponse>(ENVIRONMENT_PATH, {
    params: {
      uri: uriKey,
    },
  });
  const entries = flattenGroups(data.body);
  console.info('[sosotest] Loaded environment list', {
    uriKey,
    count: entries.length,
  });
  return entries.filter((entry) => entry.state === undefined || entry.state === 1);
}

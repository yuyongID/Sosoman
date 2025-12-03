import axios, { type AxiosInstance } from 'axios';
import { getEnvValue } from '../client';

const DEFAULT_BASE_URL = 'https://ketest-pro.api.ke.com';

const resolveBaseUrl = (): string =>
  getEnvValue('SOSOTEST_USER_SEARCH_BASE_URL') ??
  getEnvValue('SOSOTEST_COMMON_BASE_URL') ??
  DEFAULT_BASE_URL;

const userSearchClient: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 10_000,
});

userSearchClient.interceptors.request.use((config) => {
  const headers = config.headers ?? {};
  headers.Accept = headers.Accept ?? 'application/json';
  config.headers = headers;
  return config;
});

export interface UserSearchResult {
  id: number;
  userCode: string;
  name: string;
  account: string;
  orgName: string;
  positionName: string;
  secondJobSeqName: string;
  threeJobSeqName: string;
}

interface UserSearchResponse {
  code: number;
  message?: string;
  body?: UserSearchResult[];
}

export async function searchUser(keyword: string): Promise<UserSearchResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }
  const { data } = await userSearchClient.get<UserSearchResponse>('/common/search_user_info', {
    params: { key_word: trimmed },
  });
  if (data.code !== 10000) {
    throw new Error(data.message ?? '用户信息搜索失败');
  }
  if (!Array.isArray(data.body)) {
    throw new Error('用户信息搜索返回格式不正确');
  }
  return data.body;
}

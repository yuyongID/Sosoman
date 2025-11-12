import axios from 'axios';

type EnvMap = Record<string, string | undefined>;

const processEnv: EnvMap =
  typeof process !== 'undefined' && process.env ? (process.env as EnvMap) : {};

const globalEnv: EnvMap =
  typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__SOSOMAN_ENV__
    ? ((globalThis as Record<string, unknown>).__SOSOMAN_ENV__ as EnvMap)
    : {};

const resolveEnv = (key: string, fallback?: string): string | undefined =>
  globalEnv[key] ?? processEnv[key] ?? fallback;

/**
 * Shared helper so feature-specific clients can read from the same env priority
 * order (renderer injected env → process.env → fallback).
 */
export const getEnvValue = (key: string, fallback?: string): string | undefined =>
  resolveEnv(key, fallback);

/**
 * Axios instance shared across the application.
 *
 * Centralising HTTP configuration here ensures authentication headers,
 * timeouts, and error handling are kept consistent. Individual API modules
 * should remain dumb data mappers on top of this client.
 */
export const apiClient = axios.create({
  baseURL: resolveEnv('SOSOTEST_BASE_URL', 'http://localhost:3000'),
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = resolveEnv('SOSOTEST_TOKEN');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: plug in user-friendly error handling once the notification system exists.
    console.error('[api] Request failed', error);
    return Promise.reject(error);
  }
);

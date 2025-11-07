import axios from 'axios';

/**
 * Axios instance shared across the application.
 *
 * Centralising HTTP configuration here ensures authentication headers,
 * timeouts, and error handling are kept consistent. Individual API modules
 * should remain dumb data mappers on top of this client.
 */
export const apiClient = axios.create({
  baseURL: process.env.SOSOTEST_BASE_URL ?? 'http://localhost:3000',
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = process.env.SOSOTEST_TOKEN;
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

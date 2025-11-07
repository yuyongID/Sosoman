import { apiClient } from './client';

type LoginPayload = {
  username: string;
  password: string;
};

type LoginResponse = {
  token: string;
  expiresAt: string;
};

/**
 * Authentication endpoints.
 *
 * Intentionally lightweight; consumers handle persistence (e.g. secure store).
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

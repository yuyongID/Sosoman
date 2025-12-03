export type ConnectionState = 'offline' | 'online' | 'degraded';

export interface EnvironmentOption {
  value: string;
  label: string;
  requestAddr?: string;
  description?: string;
  disabled?: boolean;
}

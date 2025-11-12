import { getEnvValue } from '../client';

const normalizeBoolean = (value?: string | null): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
};

const explicitMockFlag = normalizeBoolean(getEnvValue('SOSOTEST_USE_MOCK'));
const ciMockFlag = normalizeBoolean(getEnvValue('CI'));
const nodeEnv = getEnvValue('NODE_ENV');
const derivedMockFlag = nodeEnv === 'test' ? true : undefined;

const mockSource =
  explicitMockFlag !== undefined
    ? 'SOSOTEST_USE_MOCK'
    : ciMockFlag !== undefined
      ? 'CI'
      : derivedMockFlag
        ? 'NODE_ENV'
        : undefined;

export const isSosotestMockEnabled =
  explicitMockFlag ?? ciMockFlag ?? derivedMockFlag ?? false;

export const sosotestMode: 'mock' | 'remote' = isSosotestMockEnabled ? 'mock' : 'remote';

if (isSosotestMockEnabled) {
  const source = mockSource ?? 'default';
  console.info(`[sosotest] Mock 模式已开启（来源 ${source}）`);
}

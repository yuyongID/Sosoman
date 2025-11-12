import runtimeEnvConfig from './runtimeEnv.json';
import { attachRuntimeEnv } from '@shared/config/runtimeEnvBridge';

type EnvCarrier = typeof globalThis & {
  __SOSOMAN_ENV__?: Record<string, string>;
};

const carrier = globalThis as EnvCarrier;

const missingEntries = Object.entries(runtimeEnvConfig).reduce<Record<string, string>>(
  (acc, [key, value]) => {
    if (!carrier.__SOSOMAN_ENV__ || carrier.__SOSOMAN_ENV__[key] === undefined) {
      acc[key] = value;
    }
    return acc;
  },
  {}
);

export const runtimeEnv =
  Object.keys(missingEntries).length > 0
    ? attachRuntimeEnv(missingEntries)
    : carrier.__SOSOMAN_ENV__ ?? attachRuntimeEnv(runtimeEnvConfig);

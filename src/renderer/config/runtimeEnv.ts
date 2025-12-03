import { attachRuntimeEnv, mergeRuntimeEnvOverrides } from '@shared/config/runtimeEnvBridge';
import runtimeEnvConfig from './runtimeEnv.json';
import {
  buildEnvFromLoginProfile,
  loadLoginProfile,
} from './loginPersistence';

type EnvCarrier = typeof globalThis & {
  __SOSOMAN_ENV__?: Record<string, string>;
};

const carrier = globalThis as EnvCarrier;

if (!carrier.__SOSOMAN_ENV__) {
  attachRuntimeEnv(runtimeEnvConfig);
}

const loginProfile = loadLoginProfile();
const persistedEntries = loginProfile ? buildEnvFromLoginProfile(loginProfile) : null;

export const runtimeEnv = carrier.__SOSOMAN_ENV__ ?? attachRuntimeEnv(runtimeEnvConfig);

if (persistedEntries) {
  mergeRuntimeEnvOverrides(persistedEntries);
}

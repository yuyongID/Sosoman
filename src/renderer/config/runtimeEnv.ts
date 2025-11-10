import runtimeEnvConfig from './runtimeEnv.json';
import { attachRuntimeEnv } from '@shared/config/runtimeEnvBridge';

export const runtimeEnv = attachRuntimeEnv(runtimeEnvConfig);

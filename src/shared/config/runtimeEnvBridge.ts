export type RuntimeEnvInput = Record<string, unknown>;
export type RuntimeEnvRecord = Record<string, string>;

const normalizeRuntimeEnv = (input: RuntimeEnvInput): RuntimeEnvRecord =>
  Object.entries(input).reduce<RuntimeEnvRecord>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});

type EnvCarrier = typeof globalThis & {
  __SOSOMAN_ENV__?: RuntimeEnvRecord;
};

export const attachRuntimeEnv = (input: RuntimeEnvInput): RuntimeEnvRecord => {
  const payload = normalizeRuntimeEnv(input);
  if (typeof globalThis === 'undefined') {
    return payload;
  }
  const carrier = globalThis as EnvCarrier;
  if (!carrier.__SOSOMAN_ENV__) {
    carrier.__SOSOMAN_ENV__ = { ...payload };
    return carrier.__SOSOMAN_ENV__;
  }
  Object.assign(carrier.__SOSOMAN_ENV__, payload);
  return carrier.__SOSOMAN_ENV__;
};

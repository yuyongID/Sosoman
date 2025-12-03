export interface LoginUserSnapshot {
  id: number;
  userCode: string;
  name: string;
  account: string;
  orgName: string;
  positionName: string;
  secondJobSeqName: string;
  threeJobSeqName: string;
}

export interface LoginProfileSnapshot {
  keyword: string;
  selectedUser: LoginUserSnapshot;
  interfaceFilter: string;
}

interface PersistedPayload extends LoginProfileSnapshot {
  persistedAt: number;
}

const STORAGE_KEY = 'sosoman:loginProfile';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[loginPersistence] localStorage 不可用', error);
    return null;
  }
};

const parsePayload = (raw: string | null): PersistedPayload | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedPayload;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!parsed.selectedUser?.account) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[loginPersistence] 无法解析缓存', error);
    return null;
  }
};

export const loadLoginProfile = (): LoginProfileSnapshot | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const payload = parsePayload(storage.getItem(STORAGE_KEY));
  if (!payload) {
    return null;
  }
  return {
    keyword: payload.keyword,
    interfaceFilter: payload.interfaceFilter,
    selectedUser: payload.selectedUser,
  };
};

export const persistLoginProfile = (payload: LoginProfileSnapshot): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const wrapped: PersistedPayload = {
    ...payload,
    persistedAt: Date.now(),
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(wrapped));
  } catch (error) {
    console.warn('[loginPersistence] 保存失败', error);
  }
};

export const clearLoginProfile = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[loginPersistence] 清理失败', error);
  }
};

export const buildEnvFromLoginProfile = (
  payload: LoginProfileSnapshot
): Record<string, string> => ({
  SOSOTEST_INTERFACE_FILTER: payload.interfaceFilter,
  SOSOTEST_USER_EMAIL: payload.selectedUser.account,
});

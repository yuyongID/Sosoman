import * as React from 'react';
import { mergeRuntimeEnvOverrides } from '@shared/config/runtimeEnvBridge';
import {
  buildEnvFromLoginProfile,
  clearLoginProfile,
  loadLoginProfile,
  persistLoginProfile,
  type LoginProfileSnapshot,
} from '@renderer/config/loginPersistence';

interface UseLoginProfileResult {
  profile: LoginProfileSnapshot | null;
  saveProfile: (profile: LoginProfileSnapshot) => void;
  clearProfile: () => void;
}

export function useLoginProfile(): UseLoginProfileResult {
  const [profile, setProfile] = React.useState<LoginProfileSnapshot | null>(() =>
    loadLoginProfile()
  );

  const saveProfile = React.useCallback((payload: LoginProfileSnapshot) => {
    setProfile(payload);
    persistLoginProfile(payload);
    mergeRuntimeEnvOverrides(buildEnvFromLoginProfile(payload));
  }, []);

  const clearProfile = React.useCallback(() => {
    setProfile(null);
    clearLoginProfile();
    mergeRuntimeEnvOverrides({
      SOSOTEST_INTERFACE_FILTER: '[]',
      SOSOTEST_USER_EMAIL: '',
    });
  }, []);

  return { profile, saveProfile, clearProfile };
}

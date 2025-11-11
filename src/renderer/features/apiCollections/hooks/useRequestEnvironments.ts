import * as React from 'react';
import {
  fetchSosotestEnvironmentList,
  type SosotestEnvironmentEntry,
} from '@api/sosotest/environments';
import type { EnvironmentOption } from '../types';

const determineDefaultKey = (
  list: SosotestEnvironmentEntry[],
  storedKey?: string
): string | null => {
  if (!list.length) {
    return null;
  }
  const restored = list.find(
    (entry) => entry.httpConfKey === storedKey && entry.groupType !== 'online'
  );
  if (restored) {
    return restored.httpConfKey;
  }
  const fallback = list.find((entry) => entry.groupType !== 'online');
  return fallback?.httpConfKey ?? null;
};

const dedupeEnvironments = (environments: SosotestEnvironmentEntry[]): SosotestEnvironmentEntry[] => {
  const seen = new Set<string>();
  return environments.filter((env) => {
    if (!env.httpConfKey || seen.has(env.httpConfKey)) {
      return false;
    }
    seen.add(env.httpConfKey);
    return true;
  });
};

const toEnvironmentOptions = (environments: SosotestEnvironmentEntry[]): EnvironmentOption[] =>
  environments.map((env) => ({
    value: env.httpConfKey,
    label: env.env_name ?? env.env_key ?? env.httpConfKey,
    requestAddr: env.requestAddr,
    description: env.env_name ?? env.env_key ?? env.httpConfKey,
    disabled: env.groupType === 'online',
  }));

const buildPlaceholder = (
  activeUri: string,
  environments: SosotestEnvironmentEntry[],
  hasSelectableEnvironment: boolean
): string => {
  if (!activeUri) {
    return '请选择一个接口以加载环境';
  }
  if (environments.length === 0) {
    return '正在查询环境列表…';
  }
  if (!hasSelectableEnvironment) {
    return '当前接口暂无可选环境';
  }
  return '点击选择环境';
};

export interface UseRequestEnvironmentsResult {
  selectedEnvironment: SosotestEnvironmentEntry | null;
  selectedEnvironmentLabel: string;
  selectedEnvironmentRequestAddr: string;
  environmentOptions: EnvironmentOption[];
  environmentPlaceholder: string;
  environmentButtonDisabled: boolean;
  hasSelectableEnvironment: boolean;
  handleEnvironmentChange: (key: string) => void;
}

/**
 * Encapsulates Sosotest environment loading, caching, and selection.
 *
 * Keeping this logic outside of the workbench component improves cohesion and
 * makes it easier to test data flows independently from rendering concerns.
 */
export function useRequestEnvironments(activeUri: string): UseRequestEnvironmentsResult {
  const [environments, setEnvironments] = React.useState<SosotestEnvironmentEntry[]>([]);
  const [selectedEnvironmentKey, setSelectedEnvironmentKey] = React.useState<string | null>(null);
  const environmentCacheRef = React.useRef<Record<string, SosotestEnvironmentEntry[]>>({});
  const environmentSelectionRef = React.useRef<Record<string, string>>({});
  const isMountedRef = React.useRef(false);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setEnvironmentSelectionForUri = React.useCallback(
    (key: string | null) => {
      setSelectedEnvironmentKey(key);
      if (!activeUri) {
        return;
      }
      if (key) {
        environmentSelectionRef.current[activeUri] = key;
      } else {
        delete environmentSelectionRef.current[activeUri];
      }
    },
    [activeUri]
  );

  React.useEffect(() => {
    if (!activeUri) {
      setEnvironments([]);
      setEnvironmentSelectionForUri(null);
      return;
    }

    const cached = environmentCacheRef.current[activeUri];
    if (cached?.length) {
      setEnvironments(cached);
      const nextKey = determineDefaultKey(cached, environmentSelectionRef.current[activeUri]);
      setEnvironmentSelectionForUri(nextKey);
      return;
    }

    let canceled = false;
    const loadEnvironments = async () => {
      try {
        const list = await fetchSosotestEnvironmentList(activeUri);
        if (canceled || !isMountedRef.current) {
          return;
        }
        environmentCacheRef.current[activeUri] = list;
        setEnvironments(list);
        const nextKey = determineDefaultKey(list, environmentSelectionRef.current[activeUri]);
        setEnvironmentSelectionForUri(nextKey);
      } catch (error) {
        if (canceled || !isMountedRef.current) {
          return;
        }
        console.error('[apiCollections] Failed to load sosotest environments', error);
        setEnvironments([]);
        setEnvironmentSelectionForUri(null);
      }
    };

    loadEnvironments();

    return () => {
      canceled = true;
    };
  }, [activeUri, setEnvironmentSelectionForUri]);

  const uniqueEnvironments = React.useMemo(
    () => dedupeEnvironments(environments),
    [environments]
  );

  const selectedEnvironment = React.useMemo(() => {
    if (!uniqueEnvironments.length) {
      return null;
    }
    const stored = uniqueEnvironments.find(
      (env) => env.httpConfKey === selectedEnvironmentKey && env.groupType !== 'online'
    );
    if (stored) {
      return stored;
    }
    return uniqueEnvironments.find((env) => env.groupType !== 'online') ?? null;
  }, [uniqueEnvironments, selectedEnvironmentKey]);

  const environmentOptions = React.useMemo(
    () => toEnvironmentOptions(uniqueEnvironments),
    [uniqueEnvironments]
  );

  const hasSelectableEnvironment = React.useMemo(
    () => uniqueEnvironments.some((env) => env.groupType !== 'online'),
    [uniqueEnvironments]
  );

  const environmentButtonDisabled = !activeUri || environments.length === 0;

  const environmentPlaceholder = buildPlaceholder(
    activeUri,
    environments,
    hasSelectableEnvironment
  );

  const selectedEnvironmentLabel =
    selectedEnvironment?.env_name ??
    selectedEnvironment?.env_key ??
    selectedEnvironment?.httpConfKey ??
    '';

  const selectedEnvironmentRequestAddr =
    selectedEnvironment?.requestAddr ?? selectedEnvironment?.httpConfKey ?? '';

  const handleEnvironmentChange = React.useCallback(
    (value: string) => {
      const target = uniqueEnvironments.find((entry) => entry.httpConfKey === value);
      if (!target || target.groupType === 'online') {
        return;
      }
      setEnvironmentSelectionForUri(target.httpConfKey);
    },
    [uniqueEnvironments, setEnvironmentSelectionForUri]
  );

  return {
    selectedEnvironment,
    selectedEnvironmentLabel,
    selectedEnvironmentRequestAddr,
    environmentOptions,
    environmentPlaceholder,
    environmentButtonDisabled,
    hasSelectableEnvironment,
    handleEnvironmentChange,
  };
}

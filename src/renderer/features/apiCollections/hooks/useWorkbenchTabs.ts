import * as React from 'react';
import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
} from '@shared/models/apiCollection';
import type { SosotestEnvironmentEntry } from '@api/sosotest/environments';
import { executeSosotestDebugRequest } from '@api/sosotest/debug';
import {
  fetchSosotestInterfaceDetail,
  saveSosotestInterface,
} from '@api/sosotest/interfaces';
import {
  adaptInterfaceDataToRequest,
  applyRequestOntoInterfaceData,
} from '../utils/collectionTransforms';
import {
  RequestTabState,
  buildTabId,
  cloneRequest,
  createTabState,
  serializeRequest,
} from '../utils/requestTabs';
import type { ConnectionState } from '../types';

interface UseWorkbenchTabsOptions {
  onConnectionStateChange: (state: ConnectionState) => void;
  onRequestExecuted?: (isoTimestamp: string) => void;
  setCollections: React.Dispatch<React.SetStateAction<ApiCollection[]>>;
}

interface RunActiveRequestOptions {
  selectedEnvironment: SosotestEnvironmentEntry | null;
  persistActiveEnvironmentSelection: () => void;
}

interface UseWorkbenchTabsResult {
  tabs: RequestTabState[];
  activeTabId: string | null;
  activeTab: RequestTabState | null;
  setActiveTabId: React.Dispatch<React.SetStateAction<string | null>>;
  openRequestTab: (collection: ApiCollection, request: ApiRequestDefinition) => void;
  closeTab: (tabId: string) => void;
  updateDraft: (tabId: string, draft: ApiRequestDefinition) => void;
  runActiveRequest: (options: RunActiveRequestOptions) => Promise<void>;
  cancelActiveRequest: () => void;
  saveActiveRequest: () => Promise<void>;
  retryHydration: (tabId: string, requestId: string) => void;
  primeDefaultTab: (collection: ApiCollection) => void;
}

const isAbortError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (typeof error === 'object') {
    const knownError = error as { name?: string; code?: string; message?: string };
    if (knownError.name === 'CanceledError' || knownError.code === 'ERR_CANCELED') {
      return true;
    }
    if (knownError.message?.toLowerCase().includes('canceled')) {
      return true;
    }
  }
  if (typeof error === 'string' && error.toLowerCase().includes('canceled')) {
    return true;
  }
  return false;
};

/**
 * Centralises tab state management and Sosotest interactions for the workbench.
 */
export function useWorkbenchTabs({
  onConnectionStateChange,
  onRequestExecuted,
  setCollections,
}: UseWorkbenchTabsOptions): UseWorkbenchTabsResult {
  const [tabs, setTabs] = React.useState<RequestTabState[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const defaultTabPrimedRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const runAbortControllers = React.useRef<Map<string, AbortController>>(new Map());

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const primeDefaultTab = React.useCallback(
    (collection: ApiCollection) => {
      if (defaultTabPrimedRef.current) {
        return;
      }
      const firstRequest = collection.requests[0];
      if (!firstRequest) {
        return;
      }
      const defaultTabId = buildTabId(collection.id, firstRequest.id);
      setTabs((prevTabs) => {
        if (prevTabs.some((tab) => tab.id === defaultTabId)) {
          return prevTabs;
        }
        console.info('[apiCollections] Priming default request tab', { requestId: firstRequest.id });
        return [...prevTabs, createTabState(collection, firstRequest)];
      });
      setActiveTabId((prev) => prev ?? defaultTabId);
      defaultTabPrimedRef.current = true;
    },
    []
  );

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const hydrateTabDetails = React.useCallback(
    async (tabId: string, requestId: string) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                hydrationState: 'loading',
                hydrationError: undefined,
              }
            : tab
        )
      );
      try {
        const detail = await fetchSosotestInterfaceDetail(requestId);
        if (!isMountedRef.current) {
          return;
        }
        const nextRequest = adaptInterfaceDataToRequest(detail);
        const nextSignature = serializeRequest(nextRequest);
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  request: cloneRequest(nextRequest),
                  draft: cloneRequest(nextRequest),
                  baselineSignature: nextSignature,
                  interfaceData: detail,
                  hydrationState: 'ready',
                  hydrationError: undefined,
                  isDirty: false,
                  saveError: undefined,
                }
              : tab
          )
        );
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  hydrationState: 'error',
                  hydrationError: (error as Error).message ?? '加载 API 详情失败',
                }
              : tab
          )
        );
      }
    },
    []
  );

  React.useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.hydrationState === 'idle') {
        hydrateTabDetails(tab.id, tab.requestId);
      }
    });
  }, [tabs, hydrateTabDetails]);

  const retryHydration = React.useCallback(
    (tabId: string, requestId: string) => {
      hydrateTabDetails(tabId, requestId);
    },
    [hydrateTabDetails]
  );

  const openRequestTab = React.useCallback(
    (collection: ApiCollection, request: ApiRequestDefinition) => {
      const tabId = buildTabId(collection.id, request.id);
      setTabs((prevTabs) => {
        const existing = prevTabs.find((tab) => tab.id === tabId);
        if (existing) {
          return prevTabs;
        }
        console.info('[apiCollections] Opening request tab', { requestId: request.id });
        return [...prevTabs, createTabState(collection, request)];
      });
      setActiveTabId(tabId);
    },
    []
  );

  const closeTab = React.useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const targetTab = prevTabs.find((tab) => tab.id === tabId);
        if (targetTab?.isDirty) {
          const confirmed = window.confirm('当前标签存在未保存的修改，确定要关闭吗？');
          if (!confirmed) {
            return prevTabs;
          }
        }
        const filtered = prevTabs.filter((tab) => tab.id !== tabId);
        if (prevTabs.length === filtered.length) {
          return prevTabs;
        }
        console.info('[apiCollections] Closed tab', { tabId });
        if (tabId === activeTabId) {
          const nextActiveId = filtered[filtered.length - 1]?.id ?? null;
          setActiveTabId(nextActiveId);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const updateDraft = React.useCallback((tabId: string, nextDraft: ApiRequestDefinition) => {
    const nextSignature = serializeRequest(nextDraft);
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              draft: nextDraft,
              isDirty: tab.baselineSignature !== nextSignature,
              saveError: undefined,
            }
          : tab
      )
    );
  }, []);

  const runActiveRequest = React.useCallback(
    async ({ selectedEnvironment, persistActiveEnvironmentSelection }: RunActiveRequestOptions) => {
      if (!activeTabId) {
        console.warn('[apiCollections] No active tab selected for run');
        return;
      }
      const tab = tabs.find((item) => item.id === activeTabId);
      if (!tab) {
        console.warn('[apiCollections] Active tab not found', { activeTabId });
        return;
      }
      if (tab.hydrationState !== 'ready') {
        console.warn('[apiCollections] Request not yet hydrated; cancel run', {
          requestId: tab.requestId,
        });
        return;
      }
      console.info('[apiCollections] Executing request', { requestId: tab.requestId });

      setTabs((prev) =>
        prev.map((tabState) => (tabState.id === tab.id ? { ...tabState, isRunning: true } : tabState))
      );
      onConnectionStateChange('degraded');

      const tabId = tab.id;
      const abortController = new AbortController();
      runAbortControllers.current.set(tabId, abortController);
      const cleanupAbortController = () => {
        const existing = runAbortControllers.current.get(tabId);
        if (existing === abortController) {
          runAbortControllers.current.delete(tabId);
        }
      };
      const handleSnapshot = (snapshot: ApiResponseSnapshot) => {
        if (!isMountedRef.current) {
          abortController.abort();
          cleanupAbortController();
          return;
        }
        setTabs((prev) =>
          prev.map((tabState) =>
            tabState.id === tabId
              ? {
                  ...tabState,
                  response: snapshot,
                  lastRunAt: snapshot.finishedAt,
                }
              : tabState
          )
        );
      };

      try {
        if (!tab.interfaceData) {
          throw new Error('接口详情尚未同步完成，无法执行');
        }
        if (!selectedEnvironment) {
          throw new Error('请选择一个测试环境后再发送');
        }
        persistActiveEnvironmentSelection();
        const preparedInterface = applyRequestOntoInterfaceData(tab.interfaceData, tab.draft);
        const interfaceWithEnv = {
          ...preparedInterface,
          httpConfKey: selectedEnvironment.httpConfKey,
        };
        const finalSnapshot = await executeSosotestDebugRequest(
          {
            requestId: tab.requestId,
            interfaceData: interfaceWithEnv,
          },
          { onSnapshot: handleSnapshot, signal: abortController.signal }
        );
        if (!isMountedRef.current) {
          cleanupAbortController();
          return;
        }
        setTabs((prev) =>
          prev.map((tabState) =>
            tabState.id === tabId
              ? {
                  ...tabState,
                  response: finalSnapshot,
                  isRunning: false,
                  lastRunAt: finalSnapshot.finishedAt,
                }
              : tabState
          )
        );
        onConnectionStateChange('online');
        onRequestExecuted?.(finalSnapshot.finishedAt);
        cleanupAbortController();
      } catch (error) {
        if (isAbortError(error)) {
          console.info('[apiCollections] Request cancelled by user', { tabId });
          setTabs((prev) =>
            prev.map((tabState) =>
              tabState.id === tabId ? { ...tabState, isRunning: false } : tabState
            )
          );
          onConnectionStateChange('online');
          cleanupAbortController();
          return;
        }
        console.error('[apiCollections] Execution failed', error);
        const errorSnapshot: ApiResponseSnapshot = {
          id: `error-${Date.now()}`,
          requestId: tab.requestId,
          status: 500,
          statusText: 'Execution failed',
          durationMs: 0,
          sizeInBytes: 0,
          headers: [],
          body: JSON.stringify(
            {
              error: 'Request execution failed',
              details: (error as Error).message ?? 'Unknown error',
            },
            null,
            2
          ),
          consoleLog: ['Request execution failed. Check logs for details.'],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        };
        setTabs((prev) =>
          prev.map((tabState) =>
            tabState.id === tabId
              ? {
                  ...tabState,
                  response: errorSnapshot,
                  isRunning: false,
                  lastRunAt: errorSnapshot.finishedAt,
                }
              : tabState
          )
        );
        onConnectionStateChange('degraded');
        cleanupAbortController();
      }
    },
    [activeTabId, tabs, onConnectionStateChange, onRequestExecuted]
  );

  const cancelActiveRequest = React.useCallback(() => {
    if (!activeTabId) {
      return;
    }
    const controller = runAbortControllers.current.get(activeTabId);
    if (!controller) {
      return;
    }
    controller.abort();
    setTabs((prevTabs) =>
      prevTabs.map((tab) => (tab.id === activeTabId ? { ...tab, isRunning: false } : tab))
    );
    onConnectionStateChange('online');
  }, [activeTabId, onConnectionStateChange]);

  const saveActiveRequest = React.useCallback(async () => {
    if (!activeTabId) {
      console.warn('[apiCollections] No active tab selected for save');
      return;
    }
    const targetTab = tabs.find((item) => item.id === activeTabId);
    if (!targetTab) {
      console.warn('[apiCollections] Active tab missing during save', { activeTabId });
      return;
    }
    if (!targetTab.interfaceData) {
      console.warn('[apiCollections] Interface data not hydrated yet', { requestId: targetTab.requestId });
      return;
    }
    const draftSnapshot = cloneRequest(targetTab.draft);
    const nextSignature = serializeRequest(draftSnapshot);
    const nextInterfaceData = applyRequestOntoInterfaceData(targetTab.interfaceData, draftSnapshot);

    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === targetTab.id
          ? {
              ...tab,
              isSaving: true,
              saveError: undefined,
            }
          : tab
      )
    );

    try {
      await saveSosotestInterface({
        id: nextInterfaceData.id ?? targetTab.requestId,
        interfaceData: nextInterfaceData,
      });
      if (!isMountedRef.current) {
        return;
      }
      console.info('[apiCollections] Persisted request via sosotest API', {
        requestId: targetTab.requestId,
      });
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === targetTab.id
            ? {
                ...tab,
                request: cloneRequest(draftSnapshot),
                draft: cloneRequest(draftSnapshot),
                baselineSignature: nextSignature,
                isDirty: false,
                isSaving: false,
                interfaceData: nextInterfaceData,
                saveError: undefined,
              }
            : tab
        )
      );
      setCollections((prevCollections) =>
        prevCollections.map((collection) =>
          collection.id === targetTab.collectionId
            ? {
                ...collection,
                requests: collection.requests.map((request) =>
                  request.id === targetTab.requestId ? cloneRequest(draftSnapshot) : request
                ),
              }
            : collection
        )
      );
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('[apiCollections] Failed to save sosotest request', error);
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === targetTab.id
            ? {
                ...tab,
                isSaving: false,
                saveError: (error as Error).message ?? '保存失败，请稍后重试',
              }
            : tab
        )
      );
    }
  }, [activeTabId, tabs, setCollections]);

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openRequestTab,
    closeTab,
    updateDraft,
    runActiveRequest,
    cancelActiveRequest,
    saveActiveRequest,
    retryHydration,
    primeDefaultTab,
  };
}

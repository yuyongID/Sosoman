import React from 'react';
import type { ApiCollection, ApiRequestDefinition, ApiResponseSnapshot } from '@shared/models/apiCollection';
import { executeSosotestDebugRequest } from '@api/sosotest/debug';
import { fetchSosotestEnvironmentList, type SosotestEnvironmentEntry } from '@api/sosotest/environments';
import { fetchSosotestInterfaceDetail, saveSosotestInterface } from '@api/sosotest/interfaces';
import { usePersistentNumber } from '@renderer/hooks/usePersistentNumber';
import { CollectionsSidebar } from './components/CollectionsSidebar';
import { RequestTabs } from './components/RequestTabs';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePanel } from './components/ResponsePanel';
import { useSosotestInterfaces } from './hooks/useSosotestInterfaces';
import type { ConnectionState, EnvironmentOption } from './types';
import { adaptInterfaceDataToRequest, applyRequestOntoInterfaceData } from './utils/collectionTransforms';
import {
  RequestTabState,
  buildTabId,
  cloneRequest,
  createTabState,
  serializeRequest,
} from './utils/requestTabs';
export type { ConnectionState } from './types';

export interface ApiCollectionsWorkbenchHandle {
  runActiveRequest: () => void;
  saveActiveRequest: () => void;
}

interface ApiCollectionsWorkbenchProps {
  onConnectionStateChange: (state: ConnectionState) => void;
  onRequestExecuted?: (isoTimestamp: string) => void;
}


const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const ApiCollectionsWorkbench = React.forwardRef<
  ApiCollectionsWorkbenchHandle,
  ApiCollectionsWorkbenchProps
>(({ onConnectionStateChange, onRequestExecuted }, ref) => {
  const [collectionSearch, setCollectionSearch] = React.useState('');
  const [tabs, setTabs] = React.useState<RequestTabState[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const defaultTabPrimedRef = React.useRef(false);
  const [sidebarWidth, setSidebarWidth] = usePersistentNumber('apiCollections.sidebarWidth', 280);
  const [responsePanelHeight, setResponsePanelHeight] = usePersistentNumber(
    'apiCollections.responseHeight',
    280
  );
  const [environments, setEnvironments] = React.useState<SosotestEnvironmentEntry[]>([]);
  const [selectedEnvironmentKey, setSelectedEnvironmentKey] = React.useState<string | null>(null);
  const environmentCacheRef = React.useRef<Record<string, SosotestEnvironmentEntry[]>>({});
  const environmentSelectionRef = React.useRef<Record<string, string>>({});
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const ensureDefaultTab = React.useCallback(
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
    [setActiveTabId, setTabs]
  );

  const {
    collections,
    setCollections,
    loadingCollections,
    usingMockFallback,
    paginationState,
    loadingMore,
    handleLoadMoreInterfaces,
  } = useSosotestInterfaces({
    onConnectionStateChange,
    onCollectionHydrated: ensureDefaultTab,
  });

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );
  const activeUri = React.useMemo(() => activeTab?.interfaceData?.uri ?? '', [activeTab]);
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

    const determineDefaultKey = (list: SosotestEnvironmentEntry[], storedKey?: string): string | null => {
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
        if (canceled) {
          return;
        }
        environmentCacheRef.current[activeUri] = list;
        setEnvironments(list);
        const nextKey = determineDefaultKey(list, environmentSelectionRef.current[activeUri]);
        setEnvironmentSelectionForUri(nextKey);
      } catch (error) {
        if (canceled) {
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

  const uniqueEnvironments = React.useMemo(() => {
    const seen = new Set<string>();
    return environments.filter((env) => {
      if (!env.httpConfKey) {
        return false;
      }
      if (seen.has(env.httpConfKey)) {
        return false;
      }
      seen.add(env.httpConfKey);
      return true;
    });
  }, [environments]);
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
  const environmentOptions = React.useMemo<EnvironmentOption[]>(() => {
    return uniqueEnvironments.map((env) => ({
      value: env.httpConfKey,
      label: env.env_name ?? env.env_key ?? env.httpConfKey,
      requestAddr: env.requestAddr,
      description: env.env_name ?? env.env_key ?? env.httpConfKey,
      disabled: env.groupType === 'online',
    }));
  }, [uniqueEnvironments]);
  const hasSelectableEnvironment = uniqueEnvironments.some((env) => env.groupType !== 'online');
  const environmentButtonDisabled = !activeUri || environments.length === 0;
  const environmentPlaceholder = !activeUri
    ? '请选择一个接口以加载环境'
    : environments.length === 0
    ? '正在查询环境列表…'
    : !hasSelectableEnvironment
    ? '当前接口暂无可选环境'
    : '点击选择环境';
  const selectedEnvironmentLabel =
    selectedEnvironment?.env_name ?? selectedEnvironment?.env_key ?? selectedEnvironment?.httpConfKey ?? '';
  const selectedEnvironmentRequestAddr =
    selectedEnvironment?.requestAddr ?? selectedEnvironment?.httpConfKey ?? '';
  const isRunReady = Boolean(activeTab?.interfaceData && selectedEnvironment);

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
    [setTabs]
  );

  React.useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.hydrationState === 'idle') {
        hydrateTabDetails(tab.id, tab.requestId);
      }
    });
  }, [tabs, hydrateTabDetails]);

  const handleRetryHydration = React.useCallback(
    (tabId: string, requestId: string) => {
      hydrateTabDetails(tabId, requestId);
    },
    [hydrateTabDetails]
  );

  const handleSelectRequest = React.useCallback(
    (collectionId: string, requestId: string) => {
      const collection = collections.find((item) => item.id === collectionId);
      const request = collection?.requests.find((item) => item.id === requestId);
      if (!collection || !request) {
        console.warn('[apiCollections] Unable to locate request', { collectionId, requestId });
        return;
      }

      const tabId = buildTabId(collectionId, requestId);
      setTabs((prevTabs) => {
        const existing = prevTabs.find((tab) => tab.id === tabId);
        if (existing) {
          return prevTabs;
        }
        console.info('[apiCollections] Opening request tab', { requestId });
        return [...prevTabs, createTabState(collection, request)];
      });
      setActiveTabId(tabId);
    },
    [collections]
  );

  const handleCloseTab = React.useCallback(
    (tabId: string) => {
      const targetTab = tabs.find((tab) => tab.id === tabId);
      if (targetTab?.isDirty) {
        const confirmed = window.confirm('当前标签存在未保存的修改，确定要关闭吗？');
        if (!confirmed) {
          return;
        }
      }
      setTabs((prevTabs) => {
        const filtered = prevTabs.filter((tab) => tab.id !== tabId);
        if (prevTabs.length !== filtered.length) {
          console.info('[apiCollections] Closed tab', { tabId });
        }
        if (tabId === activeTabId) {
          setActiveTabId(filtered[filtered.length - 1]?.id ?? null);
        }
        return filtered;
      });
    },
    [tabs, activeTabId]
  );

  const handleDraftChange = React.useCallback((tabId: string, nextDraft: ApiRequestDefinition) => {
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

  /**
   * Dispatches the active draft to the mock executor and streams the response back
   * into the UI while updating the connection indicator.
   */
  const handleRunActiveRequest = React.useCallback(async () => {
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
      prev.map((tabState) =>
        tabState.id === tab.id ? { ...tabState, isRunning: true } : tabState
      )
    );
    onConnectionStateChange('degraded');

    const tabId = tab.id;
    const handleSnapshot = (snapshot: ApiResponseSnapshot) => {
      if (!isMountedRef.current) {
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
        { onSnapshot: handleSnapshot }
      );
      if (!isMountedRef.current) {
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
    } catch (error) {
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
    }
  }, [activeTabId, tabs, onConnectionStateChange, onRequestExecuted, selectedEnvironment]);

  /**
   * Persists the in-flight draft back into the mock data store to mimic a save.
   */
  const handleSaveActiveRequest = React.useCallback(async () => {
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

  React.useImperativeHandle(
    ref,
    () => ({
      runActiveRequest: handleRunActiveRequest,
      saveActiveRequest: handleSaveActiveRequest,
    }),
    [handleRunActiveRequest, handleSaveActiveRequest]
  );

  const handleSidebarResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setSidebarWidth(clamp(startWidth + delta, 200, 420));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  const handleResponseResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = responsePanelHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        setResponsePanelHeight(clamp(startHeight - delta, 200, 520));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [responsePanelHeight, setResponsePanelHeight]
  );

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1f1f24' }}>
      <div style={{ width: `${sidebarWidth}px`, minWidth: '200px', maxWidth: '420px', height: '100%' }}>
        <CollectionsSidebar
          collections={collections}
          onSelectRequest={handleSelectRequest}
          searchTerm={collectionSearch}
          onSearchTermChange={setCollectionSearch}
          loading={loadingCollections}
          activeRequestId={activeTab?.requestId ?? null}
          pagination={
            usingMockFallback
              ? undefined
              : {
                  hasMore: paginationState.hasMore,
                  isLoading: loadingCollections || loadingMore,
                  onLoadMore: handleLoadMoreInterfaces,
                }
          }
        />
      </div>
      <div
        role="separator"
        onMouseDown={handleSidebarResizeStart}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: 'transparent',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '1px',
            right: '1px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '99px',
          }}
        />
      </div>
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <RequestTabs
          tabs={tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            collectionName: tab.collectionName,
            isDirty: tab.isDirty,
            isRunning: tab.isRunning,
          }))}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          environment={selectedEnvironment?.httpConfKey ?? ''}
          environmentOptions={environmentOptions}
          environmentSelectDisabled={!hasSelectableEnvironment || environmentOptions.length === 0}
          environmentPlaceholder={environmentPlaceholder}
          onEnvironmentChange={handleEnvironmentChange}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab ? (
            <>
              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <RequestEditor
                  request={activeTab.draft}
                  isRunning={activeTab.isRunning}
                  isSaving={activeTab.isSaving}
                  isDirty={activeTab.isDirty}
                  isHydrating={activeTab.hydrationState === 'idle' || activeTab.hydrationState === 'loading'}
                  hydrationError={activeTab.hydrationState === 'error' ? activeTab.hydrationError : undefined}
                  saveError={activeTab.saveError}
                  onChange={(nextRequest) => handleDraftChange(activeTab.id, nextRequest)}
                  onRun={handleRunActiveRequest}
                  onSave={handleSaveActiveRequest}
                  onRetryHydration={() => handleRetryHydration(activeTab.id, activeTab.requestId)}
                  isRunReady={isRunReady}
                  environmentOptions={environmentOptions}
                  environmentDisabled={environmentButtonDisabled}
                  environmentPlaceholder={environmentPlaceholder}
                  selectedEnvironmentKey={selectedEnvironment?.httpConfKey ?? null}
                  selectedEnvironmentLabel={selectedEnvironmentLabel}
                  selectedEnvironmentRequestAddr={selectedEnvironmentRequestAddr}
                  onEnvironmentChange={handleEnvironmentChange}
                  runReadyMessage={!isRunReady ? environmentPlaceholder : undefined}
                />
              </div>
              <div
                role="separator"
                onMouseDown={handleResponseResizeStart}
                style={{
                  height: '6px',
                  cursor: 'row-resize',
                  background: 'transparent',
                  position: 'relative',
                  margin: '0 12px',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '2px',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '99px',
                  }}
                />
              </div>
              <div
                style={{
                  padding: '12px',
                  height: `${responsePanelHeight}px`,
                  minHeight: '200px',
                }}
              >
                <ResponsePanel response={activeTab.response} isRunning={activeTab.isRunning} />
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              Choose an API request from the left to begin editing.
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

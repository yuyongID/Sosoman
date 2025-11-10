import React from 'react';
import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
  KeyValuePair,
  HttpMethod,
} from '@shared/models/apiCollection';
import { executeApiRequest, listApiCollections } from '@api/apiCollections';
import { fetchSosotestInterfaceList, type SosotestInterfaceItem } from '@api/sosotest/interfaces';
import { CollectionsSidebar } from './components/CollectionsSidebar';
import { RequestTabs } from './components/RequestTabs';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePanel } from './components/ResponsePanel';

export type ConnectionState = 'offline' | 'online' | 'degraded';

export interface ApiCollectionsWorkbenchHandle {
  runActiveRequest: () => void;
  saveActiveRequest: () => void;
}

interface ApiCollectionsWorkbenchProps {
  onConnectionStateChange: (state: ConnectionState) => void;
  onRequestExecuted?: (isoTimestamp: string) => void;
  environment: string;
  environmentOptions: string[];
  onEnvironmentChange: (env: string) => void;
}

interface RequestTabState {
  id: string;
  collectionId: string;
  collectionName: string;
  requestId: string;
  title: string;
  baselineSignature: string;
  request: ApiRequestDefinition;
  draft: ApiRequestDefinition;
  response?: ApiResponseSnapshot;
  isDirty: boolean;
  isRunning: boolean;
  lastRunAt?: string;
}

/**
 * Lightweight serialisation to detect dirty drafts without deep-compare helpers.
 */
const serializeRequest = (request: ApiRequestDefinition): string => JSON.stringify(request);

/**
 * Ensures request objects stay immutable between the API layer and UI state.
 */
const cloneRequest = (request: ApiRequestDefinition): ApiRequestDefinition =>
  JSON.parse(JSON.stringify(request));

const buildTabId = (collectionId: string, requestId: string): string =>
  `${collectionId}:${requestId}`;

const createTabState = (collection: ApiCollection, request: ApiRequestDefinition): RequestTabState => {
  const requestClone = cloneRequest(request);
  return {
    id: buildTabId(collection.id, request.id),
    collectionId: collection.id,
    collectionName: collection.name,
    requestId: request.id,
    title: request.name,
    baselineSignature: serializeRequest(requestClone),
    request: requestClone,
    draft: cloneRequest(requestClone),
    response: undefined,
    isDirty: false,
    isRunning: false,
  };
};

const usePersistentNumber = (key: string, defaultValue: number): [number, (value: number) => void] => {
  const [value, setValue] = React.useState<number>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue];
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const DEFAULT_COLLECTION_ID = 'sosotest';
const PAGE_SIZE = 20;

const createBaseCollection = (): ApiCollection => ({
  id: DEFAULT_COLLECTION_ID,
  name: 'Sosotest APIs',
  description: 'Interfaces synchronized from sosotest backend',
  tags: ['sosotest'],
  requests: [],
});

const allowedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const normalizeHttpMethod = (method?: string): HttpMethod => {
  const upper = (method ?? 'GET').toUpperCase();
  return (allowedMethods.includes(upper as HttpMethod) ? upper : 'GET') as HttpMethod;
};

const safeJsonParse = <T,>(raw: string | null | undefined): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('[apiCollections] Failed to parse JSON field from sosotest payload');
    return null;
  }
};

const toDisplayValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const recordToPairs = (record: Record<string, unknown>, prefix: string): KeyValuePair[] =>
  Object.entries(record).map(([key, value], index) => ({
    id: `${prefix}-${index}-${key}`,
    key,
    value: toDisplayValue(value),
    enabled: true,
  }));

const parseHeadersFromSosotest = (raw: string | null | undefined): KeyValuePair[] => {
  const parsed = safeJsonParse<Record<string, unknown>>(raw);
  if (!parsed) {
    return [];
  }
  return recordToPairs(parsed, 'header');
};

const parseParamsFromSosotest = (raw: string | null | undefined): KeyValuePair[] => {
  if (!raw) {
    return [];
  }
  const params = new URLSearchParams(raw);
  const pairs: KeyValuePair[] = [];
  params.forEach((value, key) => {
    pairs.push({
      id: `param-${pairs.length}-${key}`,
      key,
      value,
      enabled: true,
    });
  });
  return pairs;
};

const mergeRequests = (
  existing: ApiRequestDefinition[],
  next: ApiRequestDefinition[]
): ApiRequestDefinition[] => {
  if (existing.length === 0) {
    return next;
  }
  const merged = [...existing];
  next.forEach((request) => {
    const index = merged.findIndex((item) => item.id === request.id);
    if (index >= 0) {
      merged[index] = request;
    } else {
      merged.push(request);
    }
  });
  return merged;
};

const adaptInterfaceItemToRequest = (item: SosotestInterfaceItem): ApiRequestDefinition => ({
  id: String(item.id ?? item.interfaceId),
  name: item.title ?? 'Untitled request',
  method: normalizeHttpMethod(item.method),
  url: item.url || '/',
  description: item.casedesc ?? '',
  params: parseParamsFromSosotest(item.params),
  headers: parseHeadersFromSosotest(item.header),
  body: item.bodyContent ?? '',
  tests: [],
  preScript: item.varsPre ?? '',
  postScript: item.varsPost ?? '',
});

export const ApiCollectionsWorkbench = React.forwardRef<
  ApiCollectionsWorkbenchHandle,
  ApiCollectionsWorkbenchProps
>(({ onConnectionStateChange, onRequestExecuted, environment, environmentOptions, onEnvironmentChange }, ref) => {
  const [collections, setCollections] = React.useState<ApiCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = React.useState<boolean>(true);
  const [collectionSearch, setCollectionSearch] = React.useState('');
  const [tabs, setTabs] = React.useState<RequestTabState[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [usingMockFallback, setUsingMockFallback] = React.useState<boolean>(false);
  const [paginationState, setPaginationState] = React.useState<{
    nextPage: number;
    loadedPages: number;
    hasMore: boolean;
  }>({
    nextPage: 1,
    loadedPages: 0,
    hasMore: true,
  });
  const defaultTabPrimedRef = React.useRef(false);
  const isMountedRef = React.useRef(false);
  const [sidebarWidth, setSidebarWidth] = usePersistentNumber('apiCollections.sidebarWidth', 280);
  const [responsePanelHeight, setResponsePanelHeight] = usePersistentNumber(
    'apiCollections.responseHeight',
    280
  );

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

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

  const updateSosotestCollection = React.useCallback(
    (nextRequests: ApiRequestDefinition[], mode: 'replace' | 'append') => {
      if (mode === 'append' && nextRequests.length === 0) {
        return;
      }
      setCollections((prevCollections) => {
        const existingIndex = prevCollections.findIndex((item) => item.id === DEFAULT_COLLECTION_ID);
        const baseCollection =
          existingIndex >= 0 ? prevCollections[existingIndex] : createBaseCollection();
    const mergedRequests =
      mode === 'append'
        ? mergeRequests(baseCollection.requests, nextRequests)
        : nextRequests;
    const updatedCollection: ApiCollection = {
      ...baseCollection,
      requests: mergedRequests,
    };
    console.info('[apiCollections] Sosotest collection updated', {
      mode,
      totalRequests: mergedRequests.length,
    });
    ensureDefaultTab(updatedCollection);
        if (existingIndex >= 0) {
          const clone = [...prevCollections];
          clone[existingIndex] = updatedCollection;
          return clone;
        }
        return [updatedCollection, ...prevCollections];
      });
    },
    [ensureDefaultTab]
  );
  React.useEffect(() => {
    let canceled = false;
    const loadInitialCollections = async () => {
      setLoadingCollections(true);
      onConnectionStateChange('degraded');
      try {
        const { items } = await fetchSosotestInterfaceList({ page: 1, limit: PAGE_SIZE });
        if (canceled || !isMountedRef.current) {
          return;
        }
        console.info('[apiCollections] Loaded sosotest interfaces', items.length);
        updateSosotestCollection(items.map(adaptInterfaceItemToRequest), 'replace');
        setPaginationState({
          nextPage: 2,
          loadedPages: 1,
          hasMore: items.length === PAGE_SIZE,
        });
        setUsingMockFallback(false);
        setLoadingCollections(false);
        onConnectionStateChange('online');
      } catch (error) {
        if (canceled || !isMountedRef.current) {
          return;
        }
        console.error('[apiCollections] Failed to load sosotest interfaces', error);
        setLoadingCollections(false);
        setUsingMockFallback(true);
        setPaginationState({
          nextPage: 1,
          loadedPages: 0,
          hasMore: false,
        });
        try {
          const fallbackCollections = await listApiCollections();
          if (canceled || !isMountedRef.current) {
            return;
          }
          console.info('[apiCollections] Falling back to local mock collections');
          setCollections(fallbackCollections);
          const fallbackPrimary = fallbackCollections[0];
          if (fallbackPrimary) {
            ensureDefaultTab(fallbackPrimary);
          }
          onConnectionStateChange('online');
        } catch (fallbackError) {
          console.error('[apiCollections] Failed to load fallback collections', fallbackError);
          onConnectionStateChange('offline');
        }
      }
    };

    loadInitialCollections();

    return () => {
      canceled = true;
    };
  }, [onConnectionStateChange, updateSosotestCollection, ensureDefaultTab]);

  const handleLoadMoreInterfaces = React.useCallback(async () => {
    if (usingMockFallback || loadingMore || loadingCollections || !paginationState.hasMore) {
      return;
    }
    const targetPage = paginationState.nextPage;
    setLoadingMore(true);
    onConnectionStateChange('degraded');
    try {
      const { items } = await fetchSosotestInterfaceList({ page: targetPage, limit: PAGE_SIZE });
      if (!isMountedRef.current) {
        return;
      }
      updateSosotestCollection(items.map(adaptInterfaceItemToRequest), 'append');
      setPaginationState((prev) => ({
        nextPage: prev.nextPage + 1,
        loadedPages: prev.loadedPages + 1,
        hasMore: items.length === PAGE_SIZE,
      }));
      onConnectionStateChange('online');
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('[apiCollections] Failed to load additional sosotest interfaces', error);
      onConnectionStateChange('degraded');
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    usingMockFallback,
    loadingMore,
    loadingCollections,
    paginationState.hasMore,
    paginationState.nextPage,
    onConnectionStateChange,
    updateSosotestCollection,
  ]);

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
    [activeTabId]
  );

  const handleDraftChange = React.useCallback((tabId: string, nextDraft: ApiRequestDefinition) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              draft: nextDraft,
              isDirty: tab.baselineSignature !== serializeRequest(nextDraft),
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
    console.info('[apiCollections] Executing request', { requestId: tab.requestId });

    setTabs((prev) =>
      prev.map((tabState) =>
        tabState.id === tab.id ? { ...tabState, isRunning: true } : tabState
      )
    );
    onConnectionStateChange('degraded');

    try {
      const response = await executeApiRequest({ request: tab.draft });
      setTabs((prev) =>
        prev.map((tabState) =>
          tabState.id === tab.id
            ? {
                ...tabState,
                response,
                isRunning: false,
                lastRunAt: response.finishedAt,
              }
            : tabState
        )
      );
      onConnectionStateChange('online');
      onRequestExecuted?.(response.finishedAt);
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
          tabState.id === tab.id
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
  }, [activeTabId, tabs, onConnectionStateChange, onRequestExecuted]);

  /**
   * Persists the in-flight draft back into the mock data store to mimic a save.
   */
  const handleSaveActiveRequest = React.useCallback(() => {
    if (!activeTabId) {
      console.warn('[apiCollections] No active tab selected for save');
      return;
    }

    setTabs((prevTabs) => {
      const targetTab = prevTabs.find((tab) => tab.id === activeTabId);
      if (!targetTab) {
        console.warn('[apiCollections] Active tab missing during save', { activeTabId });
        return prevTabs;
      }
      const nextSignature = serializeRequest(targetTab.draft);
      const savedDraft = cloneRequest(targetTab.draft);
      setCollections((prevCollections) =>
        prevCollections.map((collection) =>
          collection.id === targetTab.collectionId
            ? {
                ...collection,
                requests: collection.requests.map((request) =>
                  request.id === targetTab.requestId ? cloneRequest(savedDraft) : request
                ),
              }
            : collection
        )
      );
      console.info('[apiCollections] Saved request draft', { requestId: targetTab.requestId });

      return prevTabs.map((tab) =>
        tab.id === targetTab.id
          ? {
              ...tab,
              request: savedDraft,
              draft: cloneRequest(savedDraft),
              baselineSignature: nextSignature,
              isDirty: false,
            }
          : tab
      );
    });
  }, [activeTabId]);

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
          environment={environment}
          environmentOptions={environmentOptions}
          onEnvironmentChange={onEnvironmentChange}
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
                  onChange={(nextRequest) => handleDraftChange(activeTab.id, nextRequest)}
                  onRun={handleRunActiveRequest}
                  onSave={handleSaveActiveRequest}
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

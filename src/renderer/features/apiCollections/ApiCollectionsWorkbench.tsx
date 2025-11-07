import React from 'react';
import type {
  ApiCollection,
  ApiRequestDefinition,
  ApiResponseSnapshot,
} from '@shared/models/apiCollection';
import { executeApiRequest, listApiCollections } from '@api/apiCollections';
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

export const ApiCollectionsWorkbench = React.forwardRef<
  ApiCollectionsWorkbenchHandle,
  ApiCollectionsWorkbenchProps
>(({ onConnectionStateChange, onRequestExecuted, environment, environmentOptions, onEnvironmentChange }, ref) => {
  const [collections, setCollections] = React.useState<ApiCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = React.useState<boolean>(true);
  const [collectionSearch, setCollectionSearch] = React.useState('');
  const [tabs, setTabs] = React.useState<RequestTabState[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = usePersistentNumber('apiCollections.sidebarWidth', 280);
  const [responsePanelHeight, setResponsePanelHeight] = usePersistentNumber(
    'apiCollections.responseHeight',
    280
  );

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  React.useEffect(() => {
    let isMounted = true;
    setLoadingCollections(true);
    onConnectionStateChange('degraded');

    listApiCollections()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        console.info('[apiCollections] Loaded collections', data.length);
        setCollections(data);
        setLoadingCollections(false);
        onConnectionStateChange('online');

        const firstCollection = data[0];
        const firstRequest = firstCollection?.requests[0];
        if (firstCollection && firstRequest) {
          const defaultTabId = buildTabId(firstCollection.id, firstRequest.id);
          setTabs((prevTabs) => {
            if (prevTabs.some((tab) => tab.id === defaultTabId)) {
              return prevTabs;
            }
            console.info('[apiCollections] Priming default request tab', { requestId: firstRequest.id });
            return [...prevTabs, createTabState(firstCollection, firstRequest)];
          });
          setActiveTabId((prev) => prev ?? defaultTabId);
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        console.error('[apiCollections] Failed to load collections', error);
        setLoadingCollections(false);
        onConnectionStateChange('offline');
      });

    return () => {
      isMounted = false;
    };
  }, [onConnectionStateChange]);

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

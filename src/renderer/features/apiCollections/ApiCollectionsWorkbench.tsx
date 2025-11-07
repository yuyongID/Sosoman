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
  searchQuery: string;
  onConnectionStateChange: (state: ConnectionState) => void;
  onRequestExecuted?: (isoTimestamp: string) => void;
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

export const ApiCollectionsWorkbench = React.forwardRef<
  ApiCollectionsWorkbenchHandle,
  ApiCollectionsWorkbenchProps
>(({ searchQuery, onConnectionStateChange, onRequestExecuted }, ref) => {
  const [collections, setCollections] = React.useState<ApiCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = React.useState<boolean>(true);
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null);
  const [collectionSearch, setCollectionSearch] = React.useState('');
  const [tabs, setTabs] = React.useState<RequestTabState[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);

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
        setSelectedCollectionId((prev) => prev ?? data[0]?.id ?? null);

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

  const handleSelectCollection = React.useCallback((collectionId: string) => {
    setSelectedCollectionId(collectionId);
  }, []);

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
      setSelectedCollectionId(collectionId);
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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <CollectionsSidebar
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        onSelectCollection={handleSelectCollection}
        onSelectRequest={handleSelectRequest}
        searchTerm={collectionSearch}
        onSearchTermChange={setCollectionSearch}
        externalFilter={searchQuery}
        loading={loadingCollections}
      />
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
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab ? (
            <>
              <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                <RequestEditor
                  request={activeTab.draft}
                  isRunning={activeTab.isRunning}
                  onChange={(nextRequest) => handleDraftChange(activeTab.id, nextRequest)}
                  onRun={handleRunActiveRequest}
                  onSave={handleSaveActiveRequest}
                />
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', minHeight: '240px' }}>
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

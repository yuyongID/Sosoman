import React from 'react';
import type { ApiCollection } from '@shared/models/apiCollection';
import { CollectionsSidebar } from './components/CollectionsSidebar';
import { RequestTabs } from './components/RequestTabs';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePanel } from './components/ResponsePanel';
import { useSosotestInterfaces } from './hooks/useSosotestInterfaces';
import { useRequestEnvironments } from './hooks/useRequestEnvironments';
import type { ConnectionState } from './types';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { useWorkbenchLayout, MIN_RESPONSE_PANEL_HEIGHT } from './hooks/useWorkbenchLayout';
import { useWorkbenchTabs } from './hooks/useWorkbenchTabs';
import { useWorkbenchConsole } from './hooks/useWorkbenchConsole';
export type { ConnectionState } from './types';

export interface ApiCollectionsWorkbenchHandle {
  runActiveRequest: () => void;
  saveActiveRequest: () => void;
  toggleConsoleDrawer: () => void;
}

interface ApiCollectionsWorkbenchProps {
  onConnectionStateChange: (state: ConnectionState) => void;
  onRequestExecuted?: (isoTimestamp: string) => void;
  onConsoleAvailabilityChange?: (count: number) => void;
  onMockModeChange?: (usingMock: boolean) => void;
}

export const ApiCollectionsWorkbench = React.forwardRef<
  ApiCollectionsWorkbenchHandle,
  ApiCollectionsWorkbenchProps
>(({ onConnectionStateChange, onRequestExecuted, onConsoleAvailabilityChange, onMockModeChange }, ref) => {
  const [collectionSearch, setCollectionSearch] = React.useState('');
  const ensureDefaultTabRef = React.useRef<(collection: ApiCollection) => void>(() => {});
  const handleCollectionHydrated = React.useCallback(
    (collection: ApiCollection) => {
      ensureDefaultTabRef.current(collection);
    },
    []
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
    onCollectionHydrated: handleCollectionHydrated,
  });

  React.useEffect(() => {
    onMockModeChange?.(usingMockFallback);
  }, [usingMockFallback, onMockModeChange]);

  const {
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
  } = useWorkbenchTabs({
    onConnectionStateChange,
    onRequestExecuted,
    setCollections,
  });

  React.useEffect(() => {
    ensureDefaultTabRef.current = primeDefaultTab;
  }, [primeDefaultTab]);

  const {
    sidebarWidth,
    handleSidebarResizeStart,
    contentAreaRef,
    responsePanelHeight,
    handleResponseResizeStart,
    isRequestPanelFullscreen,
    isResponsePanelFullscreen,
    isAnyPanelFullscreen,
    togglePanelFullscreen,
  } = useWorkbenchLayout();

  const activeUri = React.useMemo(() => activeTab?.interfaceData?.uri ?? '', [activeTab]);
  const {
    selectedEnvironment,
    selectedEnvironmentLabel,
    selectedEnvironmentRequestAddr,
    environmentOptions,
    environmentPlaceholder,
    environmentButtonDisabled,
    hasSelectableEnvironment,
    handleEnvironmentChange,
    persistActiveEnvironmentSelection,
  } = useRequestEnvironments(activeUri);

  const {
    consoleLines,
    consoleDrawerOpen,
    toggleConsoleDrawer,
    closeConsoleDrawer,
  } = useWorkbenchConsole({ activeTab, onConsoleAvailabilityChange });

  const isRunReady = Boolean(activeTab?.interfaceData && selectedEnvironment);

  const handleSelectRequest = React.useCallback(
    (collectionId: string, requestId: string) => {
      const collection = collections.find((item) => item.id === collectionId);
      const request = collection?.requests.find((item) => item.id === requestId);
      if (!collection || !request) {
        console.warn('[apiCollections] Unable to locate request', { collectionId, requestId });
        return;
      }
      openRequestTab(collection, request);
    },
    [collections, openRequestTab]
  );

  const runWithEnvironment = React.useCallback(() => {
    void runActiveRequest({
      selectedEnvironment,
      persistActiveEnvironmentSelection,
    });
  }, [runActiveRequest, selectedEnvironment, persistActiveEnvironmentSelection]);

  const saveActiveRequestMemo = React.useCallback(() => {
    void saveActiveRequest();
  }, [saveActiveRequest]);

  React.useImperativeHandle(
    ref,
    () => ({
      runActiveRequest: runWithEnvironment,
      saveActiveRequest: saveActiveRequestMemo,
      toggleConsoleDrawer,
    }),
    [runWithEnvironment, saveActiveRequestMemo, toggleConsoleDrawer]
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
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative',
        }}
      >
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
          onCloseTab={closeTab}
          environment={selectedEnvironment?.httpConfKey ?? ''}
          environmentOptions={environmentOptions}
          environmentSelectDisabled={!hasSelectableEnvironment || environmentOptions.length === 0}
          environmentPlaceholder={environmentPlaceholder}
          onEnvironmentChange={handleEnvironmentChange}
        />
        <div
          ref={contentAreaRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            position: 'relative',
          }}
        >
          {activeTab ? (
            <>
              {!isResponsePanelFullscreen && (
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
                    onChange={(nextRequest) => updateDraft(activeTab.id, nextRequest)}
                    onRun={runWithEnvironment}
                    onSave={saveActiveRequestMemo}
                    onRetryHydration={() => retryHydration(activeTab.id, activeTab.requestId)}
                    isRunReady={isRunReady}
                    environmentOptions={environmentOptions}
                    environmentDisabled={environmentButtonDisabled}
                    environmentPlaceholder={environmentPlaceholder}
                    selectedEnvironmentKey={selectedEnvironment?.httpConfKey ?? null}
                    selectedEnvironmentLabel={selectedEnvironmentLabel}
                    selectedEnvironmentRequestAddr={selectedEnvironmentRequestAddr}
                    onEnvironmentChange={handleEnvironmentChange}
                    runReadyMessage={!isRunReady ? environmentPlaceholder : undefined}
                    isFullscreen={isRequestPanelFullscreen}
                    onToggleFullscreen={() => togglePanelFullscreen('request')}
                  />
                </div>
              )}
              {!isAnyPanelFullscreen && (
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
              )}
              {!isRequestPanelFullscreen && (
                <div
                  style={
                    isResponsePanelFullscreen
                      ? {
                          flex: 1,
                          minHeight: 0,
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                        }
                      : {
                          padding: '12px',
                          height: `${responsePanelHeight}px`,
                          minHeight: `${MIN_RESPONSE_PANEL_HEIGHT}px`,
                        }
                  }
                >
                  <ResponsePanel
                    response={activeTab.response}
                    isRunning={activeTab.isRunning}
                    onCancel={cancelActiveRequest}
                    isFullscreen={isResponsePanelFullscreen}
                    onToggleFullscreen={() => togglePanelFullscreen('response')}
                  />
                </div>
              )}
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
          <ConsoleDrawer
            isOpen={consoleDrawerOpen}
            lines={consoleLines}
            onClose={closeConsoleDrawer}
          />
        </div>
      </section>
    </div>
  );
});

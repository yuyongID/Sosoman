import * as React from 'react';
import type { ApiCollection, ApiRequestDefinition } from '@shared/models/apiCollection';
import { listApiCollections } from '@api/apiCollections';
import { fetchSosotestInterfaceList } from '@api/sosotest/interfaces';
import {
  adaptInterfaceItemToRequest,
  createBaseCollection,
  DEFAULT_COLLECTION_ID,
  mergeRequests,
} from '../utils/collectionTransforms';
import type { ConnectionState } from '../types';

const PAGE_SIZE = 20;

interface UseSosotestInterfacesOptions {
  onConnectionStateChange: (state: ConnectionState) => void;
  onCollectionHydrated?: (collection: ApiCollection) => void;
}

interface PaginationState {
  nextPage: number;
  loadedPages: number;
  hasMore: boolean;
}

interface UseSosotestInterfacesResult {
  collections: ApiCollection[];
  setCollections: React.Dispatch<React.SetStateAction<ApiCollection[]>>;
  loadingCollections: boolean;
  usingMockFallback: boolean;
  paginationState: PaginationState;
  loadingMore: boolean;
  handleLoadMoreInterfaces: () => Promise<void>;
}

export function useSosotestInterfaces({
  onConnectionStateChange,
  onCollectionHydrated,
}: UseSosotestInterfacesOptions): UseSosotestInterfacesResult {
  const [collections, setCollections] = React.useState<ApiCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = React.useState<boolean>(true);
  const [usingMockFallback, setUsingMockFallback] = React.useState<boolean>(false);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [paginationState, setPaginationState] = React.useState<PaginationState>({
    nextPage: 1,
    loadedPages: 0,
    hasMore: true,
  });
  const isMountedRef = React.useRef(false);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        onCollectionHydrated?.(updatedCollection);
        if (existingIndex >= 0) {
          const clone = [...prevCollections];
          clone[existingIndex] = updatedCollection;
          return clone;
        }
        return [updatedCollection, ...prevCollections];
      });
    },
    [onCollectionHydrated]
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
            onCollectionHydrated?.(fallbackPrimary);
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
  }, [onConnectionStateChange, updateSosotestCollection, onCollectionHydrated]);

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

  return {
    collections,
    setCollections,
    loadingCollections,
    usingMockFallback,
    paginationState,
    loadingMore,
    handleLoadMoreInterfaces,
  };
}

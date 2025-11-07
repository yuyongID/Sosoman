import React from 'react';
import type { ApiCollection } from '@shared/models/apiCollection';

interface CollectionsSidebarProps {
  collections: ApiCollection[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string) => void;
  onSelectRequest: (collectionId: string, requestId: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  externalFilter: string;
  loading: boolean;
}

const methodColor: Record<string, string> = {
  GET: '#16a34a',
  POST: '#2563eb',
  PUT: '#ea580c',
  PATCH: '#a16207',
  DELETE: '#dc2626',
};

const sidebarStyles: React.CSSProperties = {
  width: '280px',
  borderRight: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
};

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onSelectRequest,
  searchTerm,
  onSearchTermChange,
  externalFilter,
  loading,
}) => {
  const combinedFilter = `${searchTerm} ${externalFilter}`.trim().toLowerCase();

  const filteredCollections = React.useMemo(() => {
    if (!combinedFilter) {
      return collections;
    }
    return collections
      .map((collection) => {
        const matchesCollection = collection.name.toLowerCase().includes(combinedFilter);
        const filteredRequests = collection.requests.filter(
          (request) =>
            request.name.toLowerCase().includes(combinedFilter) ||
            request.method.toLowerCase().includes(combinedFilter) ||
            request.url.toLowerCase().includes(combinedFilter)
        );
        if (!matchesCollection && filteredRequests.length === 0) {
          return null;
        }
        return {
          ...collection,
          requests: matchesCollection ? collection.requests : filteredRequests,
        };
      })
      .filter((item): item is ApiCollection => Boolean(item));
  }, [collections, combinedFilter]);

  return (
    <aside style={sidebarStyles}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>API collections</div>
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search collection or request"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}
        />
      </div>
      {loading && (
        <div style={{ padding: '16px', fontSize: '0.9rem', color: '#6b7280' }}>Loading collections…</div>
      )}
      {!loading && filteredCollections.length === 0 && (
        <div style={{ padding: '16px', fontSize: '0.9rem', color: '#6b7280' }}>
          No collections match “{combinedFilter}”.
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredCollections.map((collection) => {
          const isSelected = collection.id === selectedCollectionId;
          return (
            <section
              key={collection.id}
              style={{
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: isSelected ? '#f9fafb' : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => onSelectCollection(collection.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <div>{collection.name}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {collection.description ?? 'No description'}
                </div>
              </button>
              <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 12px 0' }}>
                {collection.requests.map((request) => (
                  <li key={request.id}>
                    <button
                      type="button"
                      onClick={() => onSelectRequest(collection.id, request.id)}
                      style={{
                        width: '100%',
                        padding: '8px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#fff',
                          backgroundColor: methodColor[request.method] ?? '#4b5563',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {request.method}
                      </span>
                      <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem' }}>{request.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
};

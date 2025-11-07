import React from 'react';
import type { ApiCollection, HttpMethod } from '@shared/models/apiCollection';

interface CollectionsSidebarProps {
  collections: ApiCollection[];
  activeRequestId: string | null;
  onSelectRequest: (collectionId: string, requestId: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  loading: boolean;
}

const methodColor: Record<HttpMethod, string> = {
  GET: '#16a34a',
  POST: '#2563eb',
  PUT: '#ea580c',
  PATCH: '#a16207',
  DELETE: '#dc2626',
};

const sidebarStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRight: '1px solid rgba(255, 255, 255, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1f1f24',
  color: '#f3f4f6',
};

interface TreeRequest {
  id: string;
  collectionId: string;
  method: HttpMethod;
  name: string;
  url: string;
  collectionName: string;
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  collections,
  activeRequestId,
  onSelectRequest,
  searchTerm,
  onSearchTermChange,
  loading,
}) => {
  const treeRequests = React.useMemo(() => {
    const result: TreeRequest[] = [];
    collections.forEach((collection) => {
      collection.requests.forEach((request) => {
        result.push({
          id: request.id,
          collectionId: collection.id,
          method: request.method,
          name: request.name,
          url: request.url,
          collectionName: collection.name,
        });
      });
    });
    return result;
  }, [collections]);

  const filteredRequests = React.useMemo(() => {
    const filter = searchTerm.trim().toLowerCase();
    if (!filter) {
      return treeRequests;
    }
    return treeRequests.filter(
      (request) =>
        request.name.toLowerCase().includes(filter) ||
        request.method.toLowerCase().includes(filter) ||
        request.url.toLowerCase().includes(filter) ||
        request.collectionName.toLowerCase().includes(filter)
    );
  }, [treeRequests, searchTerm]);

  return (
    <aside style={sidebarStyles}>
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search requests"
          style={{
            width: 'calc(100% - 12px)',
            display: 'block',
            margin: '0 auto',
            padding: '6px 8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            backgroundColor: '#2a2d33',
            color: '#f3f4f6',
          }}
        />
      </div>
      {loading && (
        <div style={{ padding: '16px', fontSize: '0.9rem', color: '#9ca3af' }}>Loading collections…</div>
      )}
      {!loading && filteredRequests.length === 0 && (
        <div style={{ padding: '16px', fontSize: '0.9rem', color: '#9ca3af' }}>No requests match your search.</div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            margin: '8px 0',
            paddingLeft: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {filteredRequests.map((request) => {
            const isActive = request.id === activeRequestId;
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelectRequest(request.collectionId, request.id)}
                  style={{
                    border: 'none',
                    background: isActive ? 'rgba(33, 144, 255, 0.12)' : 'transparent',
                    textAlign: 'left',
                    padding: '4px 6px 4px 12px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: isActive ? '#ffffff' : '#cdd0d5',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: '#fff',
                      backgroundColor: methodColor[request.method] ?? '#4b5563',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}
                  >
                    {request.method}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 600 : 500,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {request.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{request.url}</span>
                  </div>
                </button>
              );
          })}
        </div>
      </div>
    </aside>
  );
};

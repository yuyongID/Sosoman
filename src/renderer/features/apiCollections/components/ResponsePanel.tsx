import React from 'react';
import type { ApiResponseSnapshot } from '@shared/models/apiCollection';

type ResponseTabKey = 'body' | 'headers' | 'console';

interface ResponsePanelProps {
  response?: ApiResponseSnapshot;
  isRunning: boolean;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, isRunning }) => {
  const [activeTab, setActiveTab] = React.useState<ResponseTabKey>('body');

  React.useEffect(() => {
    if (response) {
      setActiveTab('body');
    }
  }, [response?.id]);

  if (isRunning) {
    return (
      <section
        style={{
          padding: '16px',
          color: '#2190FF',
          minHeight: '200px',
          backgroundColor: '#2a2d33',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
        }}
      >
        Sending request…
      </section>
    );
  }

  if (!response) {
    return (
      <section
        style={{
          padding: '16px',
          color: '#9ca3af',
          minHeight: '200px',
          backgroundColor: '#2a2d33',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
        }}
      >
        Send a request to preview the response payload.
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '220px',
        backgroundColor: '#2a2d33',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        color: '#f3f4f6',
        height: '100%',
      }}
    >
      <header style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span
          style={{
            fontWeight: 600,
            color: response.status >= 400 ? '#f87171' : '#4ade80',
          }}
        >
          {response.status} {response.statusText}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
          {response.durationMs} ms · {(response.sizeInBytes / 1024).toFixed(1)} kb
        </span>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginLeft: 'auto' }}>
          {new Date(response.finishedAt).toLocaleTimeString()}
        </span>
      </header>
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {(['body', 'headers', 'console'] as ResponseTabKey[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            style={{
              border: 'none',
              borderBottom: activeTab === tabKey ? '2px solid #2190FF' : '2px solid transparent',
              background: 'none',
              padding: '6px 0',
              cursor: 'pointer',
              fontWeight: activeTab === tabKey ? 600 : 500,
              color: activeTab === tabKey ? '#ffffff' : '#cdd0d5',
            }}
          >
            {tabKey.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ fontFamily: activeTab === 'body' ? 'monospace' : 'inherit' }}>
        {activeTab === 'body' && (
          <pre
            style={{
              background: '#0f1115',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '320px',
              overflow: 'auto',
              fontSize: '0.85rem',
            }}
          >
            {response.body}
          </pre>
        )}
        {activeTab === 'headers' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              {response.headers.map((header) => (
                <tr key={header.id}>
                  <td
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '6px 8px',
                      color: '#9ca3af',
                      width: '30%',
                    }}
                  >
                    {header.key}
                  </td>
                  <td style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '6px 8px' }}>
                    {header.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'console' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#cdd0d5' }}>
            {response.consoleLog.map((line, index) => (
              <li key={`${response.id}-${index}`} style={{ padding: '4px 0' }}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

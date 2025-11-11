import React from 'react';
import type { ApiResponseSnapshot } from '@shared/models/apiCollection';

type ResponseTabKey = 'body' | 'headers' | 'console' | 'testResult';

interface ResponsePanelProps {
  response?: ApiResponseSnapshot;
  isRunning: boolean;
}

const parseHeaderData = (headerData: unknown): Record<string, string> => {
  if (!headerData) {
    return {};
  }
  if (typeof headerData === 'string') {
    try {
      return JSON.parse(headerData);
    } catch {
      return { header: headerData };
    }
  }
  if (typeof headerData === 'object') {
    return Object.entries(headerData).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});
  }
  return { header: String(headerData) };
};

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

  const bodyContent = response.sosotestBody?.respBodyText ?? response.body;
  const headerTable = parseHeaderData(response.sosotestBody?.header ?? null);
  const fallbackHeaderTable =
    response.headers.reduce<Record<string, string>>((acc, header) => {
      acc[header.key] = header.value;
      return acc;
    }, {});
  const assertResult = response.sosotestBody?.assertResult;
  const consoleLines = [...response.consoleLog];
  if (response.sosotestBody) {
    consoleLines.push(JSON.stringify(response.sosotestBody, null, 2));
  }

  const renderHeaderTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <tbody>
        {Object.entries(Object.keys(headerTable).length ? headerTable : fallbackHeaderTable).map(
          ([key, value]) => (
            <tr key={key}>
            <td
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '6px 8px',
                color: '#9ca3af',
                width: '30%',
              }}
            >
              {key}
            </td>
            <td style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '6px 8px' }}>
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

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
        {(['body', 'headers', 'console', 'testResult'] as ResponseTabKey[]).map((tabKey) => (
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
      <div>
        {activeTab === 'body' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <pre
              style={{
                background: '#0f1115',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '320px',
                overflow: 'auto',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                width: '100%',
                scrollbarColor: '#4b5563 transparent',
              }}
            >
              {bodyContent}
            </pre>
          </div>
        )}
        {activeTab === 'headers' && renderHeaderTable()}
        {activeTab === 'console' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {consoleLines.map((line, index) => (
              <pre
                key={`${response.id}-${index}`}
                style={{
                  margin: 0,
                  backgroundColor: '#0f1115',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  color: '#cdd0d5',
                  boxSizing: 'border-box',
                  width: '100%',
                  overflow: 'auto',
                  scrollbarColor: '#4b5563 transparent',
                }}
              >
                {line}
              </pre>
            ))}
          </div>
        )}
        {activeTab === 'testResult' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assertResult && (
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px',
                  backgroundColor: '#0f1115',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>校验响应</p>
                <pre
                  style={{
                    margin: '6px 0 0',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.8rem',
                    color: '#f3f4f6',
                    boxSizing: 'border-box',
                    width: '100%',
                    overflow: 'auto',
                    scrollbarColor: '#4b5563 transparent',
                  }}
                >
                  {assertResult}
                </pre>
              </div>
            )}
            {response.sosotestBody?.varsPre && (
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px',
                  backgroundColor: '#0f1115',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cdd0d5' }}>varsPre</p>
                <pre
                  style={{
                    margin: '6px 0 0',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.85rem',
                  }}
                >
                  {response.sosotestBody.varsPre}
                </pre>
              </div>
            )}
            {response.sosotestBody?.varsPost && (
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px',
                  backgroundColor: '#0f1115',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cdd0d5' }}>varsPost</p>
                <pre
                  style={{
                    margin: '6px 0 0',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.85rem',
                  }}
                >
                  {response.sosotestBody.varsPost}
                </pre>
              </div>
            )}
            {!assertResult &&
              !response.sosotestBody?.varsPre &&
              !response.sosotestBody?.varsPost && (
                <div style={{ color: '#cdd0d5', fontSize: '0.85rem' }}>暂无 TestResult 结果</div>
              )}
          </div>
        )}
      </div>
    </section>
  );
};

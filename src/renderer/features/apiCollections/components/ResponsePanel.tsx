import React from 'react';
import type { ApiResponseSnapshot } from '@shared/models/apiCollection';

type ResponseTabKey = 'body' | 'headers' | 'testResult';

interface ResponsePanelProps {
  response?: ApiResponseSnapshot;
  isRunning: boolean;
}

const PANEL_SURFACE = '#2a2d33';
const DATA_SURFACE = '#1d1f26';
const PANEL_SHADOW = '0 10px 30px rgba(0, 0, 0, 0.25)';

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
  const [activeTestResultTab, setActiveTestResultTab] =
    React.useState<'assertResult' | 'varsPre' | 'varsPost'>('assertResult');

  React.useEffect(() => {
    if (response) {
      setActiveTab('body');
    }
  }, [response?.id]);

  const assertResult = response?.sosotestBody?.assertResult;
  const testResultOptions = React.useMemo(
    () => [
      { key: 'assertResult' as const, label: 'Assert 结果', value: assertResult },
      { key: 'varsPre' as const, label: 'varsPre', value: response?.sosotestBody?.varsPre },
      { key: 'varsPost' as const, label: 'varsPost', value: response?.sosotestBody?.varsPost },
    ],
    [assertResult, response],
  );
  const activeTestResultContent = testResultOptions.find((tab) => tab.key === activeTestResultTab);

  React.useEffect(() => {
    const defaultTab = testResultOptions.find((tab) => Boolean(tab.value))?.key ?? 'assertResult';
    setActiveTestResultTab(defaultTab);
  }, [testResultOptions]);

  const bodyContent = response?.sosotestBody?.respBodyText ?? response?.body;
  const headerTable = parseHeaderData(response?.sosotestBody?.header ?? null);
  const fallbackHeaderTable =
    (response?.headers ?? []).reduce<Record<string, string>>((acc, header) => {
      acc[header.key] = header.value;
      return acc;
    }, {});

  const baseSectionStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    height: '100%',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: PANEL_SURFACE,
    borderRadius: '10px',
    boxShadow: PANEL_SHADOW,
    color: '#f3f4f6',
  };
  const centerContentStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (isRunning) {
    return (
      <section
        style={{
          ...baseSectionStyle,
          padding: '18px',
        }}
      >
        <div style={centerContentStyle}>
          <span style={{ color: '#2190FF' }}>Sending request…</span>
        </div>
      </section>
    );
  }

  if (!response) {
    return (
      <section
        style={{
          ...baseSectionStyle,
          padding: '24px',
          backgroundColor: DATA_SURFACE,
        }}
      >
        <div style={centerContentStyle}>
          <span style={{ color: '#cdd0d5', fontSize: '0.95rem', textAlign: 'center' }}>
            点击“发送”按钮获取返回结果
          </span>
        </div>
      </section>
    );
  }

  const renderHeaderTable = () => (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.9rem',
        tableLayout: 'fixed',
      }}
    >
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
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {key}
              </td>
              <td
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '6px 8px',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {value}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );

  return (
    <section style={baseSectionStyle}>
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {(['body', 'headers', 'testResult'] as ResponseTabKey[]).map((tabKey) => (
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'body' && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <pre
              className="dark-scrollbar"
              style={{
                flex: 1,
                margin: 0,
                background: DATA_SURFACE,
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                overflow: 'auto',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                width: '100%',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                lineHeight: 1.45,
                scrollbarColor: '#4b5563 transparent',
              }}
            >
              {bodyContent ?? '暂无响应 Body'}
            </pre>
          </div>
        )}
        {activeTab === 'headers' && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              className="dark-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                borderRadius: '8px',
                backgroundColor: DATA_SURFACE,
                padding: '12px',
              }}
            >
              {renderHeaderTable()}
            </div>
          </div>
        )}
        {activeTab === 'testResult' && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {testResultOptions.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTestResultTab(tab.key)}
                  style={{
                    border: 'none',
                    borderBottom:
                      activeTestResultTab === tab.key ? '2px solid #2190FF' : '2px solid transparent',
                    background: activeTestResultTab === tab.key ? '#1f1f24' : 'transparent',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontWeight: activeTestResultTab === tab.key ? 600 : 500,
                    color: tab.value ? '#ffffff' : '#6b7280',
                    fontSize: '0.85rem',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className="dark-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                borderRadius: '8px',
                backgroundColor: DATA_SURFACE,
                padding: '12px',
              }}
            >
              {activeTestResultContent?.value ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: activeTestResultContent.value,
                  }}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontSize: '0.9rem',
                    color: '#f3f4f6',
                  }}
                />
              ) : (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '28px 0' }}>
                  当前分项暂未提供数据
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

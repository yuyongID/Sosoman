import React from 'react';
import type { ApiResponseSnapshot } from '@shared/models/apiCollection';
import { MonacoCodeEditor } from '@renderer/components/MonacoCodeEditor';

type ResponseTabKey = 'body' | 'headers' | 'testResult';

interface ResponsePanelProps {
  response?: ApiResponseSnapshot;
  isRunning: boolean;
  onCancel?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
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

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  isRunning,
  onCancel,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
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

  const rawBodyContent = response?.sosotestBody?.respBodyText ?? response?.body;
  const bodyContent = React.useMemo(() => {
    if (rawBodyContent === null || rawBodyContent === undefined) {
      return '';
    }
    if (typeof rawBodyContent === 'string') {
      try {
        const parsed = JSON.parse(rawBodyContent);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return rawBodyContent;
      }
    }
    if (typeof rawBodyContent === 'object') {
      try {
        return JSON.stringify(rawBodyContent, null, 2);
      } catch {
        return String(rawBodyContent);
      }
    }
    return String(rawBodyContent);
  }, [rawBodyContent]);
  const headerTable = parseHeaderData(response?.sosotestBody?.header ?? null);
  const fallbackHeaderTable =
    (response?.headers ?? []).reduce<Record<string, string>>((acc, header) => {
      acc[header.key] = header.value;
      return acc;
    }, {});
  const testResultRaw = response?.sosotestBody?.testResult;
  const normalizedTestResult =
    typeof testResultRaw === 'string' ? testResultRaw.trim().toUpperCase() : '';
  const testResultBadgeLabel = normalizedTestResult || 'N/A';
  const testResultAccent = (() => {
    if (normalizedTestResult === 'PASS') {
      return {
        backgroundColor: 'rgba(74, 222, 128, 0.16)',
        border: '1px solid rgba(74, 222, 128, 0.4)',
        color: '#4ade80',
      };
    }
    if (normalizedTestResult === 'FAIL') {
      return {
        backgroundColor: 'rgba(248, 113, 113, 0.16)',
        border: '1px solid rgba(248, 113, 113, 0.45)',
        color: '#f87171',
      };
    }
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#e5e7eb',
    };
  })();
  const executeTakeTimeRaw = response?.sosotestBody?.executeTakeTime;
  const executeTakeTimeNumeric =
    typeof executeTakeTimeRaw === 'number'
      ? executeTakeTimeRaw
      : typeof executeTakeTimeRaw === 'string'
      ? Number(executeTakeTimeRaw)
      : Number.NaN;
  const executeTakeTimeLabel = Number.isFinite(executeTakeTimeNumeric)
    ? `${executeTakeTimeNumeric} ms`
    : '--';

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
          padding: '24px',
        }}
      >
        <div
          style={{
            ...centerContentStyle,
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div className="loading-spinner" aria-label="请求发送中" />
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                backgroundColor: 'transparent',
                color: '#f3f4f6',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'background 120ms ease, color 120ms ease',
              }}
            >
              取消
            </button>
          ) : null}
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <span
            style={{
              padding: '2px 12px',
              borderRadius: '999px',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              ...testResultAccent,
            }}
          >
            {testResultBadgeLabel}
          </span>
          <span
            style={{
              padding: '2px 12px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#f3f4f6',
              fontWeight: 600,
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            {executeTakeTimeLabel}
          </span>
          {onToggleFullscreen ? (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-pressed={isFullscreen}
              title={isFullscreen ? '退出响应面板全屏' : '切换响应面板全屏'}
              style={{
                width: '34px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: isFullscreen ? 'rgba(33, 144, 255, 0.2)' : 'transparent',
                color: '#f3f4f6',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {isFullscreen ? '⤡' : '⤢'}
            </button>
          ) : null}
        </div>
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
            <MonacoCodeEditor
              language="json"
              value={bodyContent}
              placeholder="暂无响应 Body"
              readOnly
              folding
              minHeight={0}
              ariaLabel="response-body-viewer"
              options={{
                glyphMargin: false,
                lineDecorationsWidth: 0,
                lineNumbers: 'off',
                scrollbar: { vertical: 'auto', horizontal: 'auto' },
              }}
            />
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

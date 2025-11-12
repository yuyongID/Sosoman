import React from 'react';

interface ConsoleDrawerProps {
  isOpen: boolean;
  lines: string[];
  onClose: () => void;
}

/**
 * Console drawer display that stays presentation-focused and oblivious to the
 * surrounding request/editor state, improving cohesion for ApiCollectionsWorkbench.
 */
export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({ isOpen, lines, onClose }) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div
      role="dialog"
      aria-label="Console Logs"
      style={{
        position: 'absolute',
        left: '12px',
        right: '12px',
        bottom: '12px',
        maxHeight: '60%',
        backgroundColor: '#111218',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        boxShadow: '0 25px 45px rgba(0, 0, 0, 0.45)',
        padding: '16px',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>
          Console Logs ({lines.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
          aria-label="Close console drawer"
        >
          ×
        </button>
      </div>
      <div
        className="dark-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '6px',
        }}
      >
        {lines.length === 0 ? (
          <div
            style={{
              color: '#9ca3af',
              fontSize: '0.85rem',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            暂无 Console 输出
          </div>
        ) : (
          lines.map((line, index) => {
            const summaryLine = line.split('\n')[0] ?? '';
            const truncated = summaryLine.length > 110 ? `${summaryLine.slice(0, 110)}…` : summaryLine;
            return (
              <details
                key={`console-${index}`}
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: '#1d1f26',
                  padding: '10px',
                }}
              >
                <summary
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: '#f3f4f6',
                    fontSize: '0.85rem',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Log {index + 1}</span>
                  <span style={{ color: '#9ca3af', flex: 1, textAlign: 'right' }}>
                    {truncated || '空日志'}
                  </span>
                </summary>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontSize: '0.85rem',
                    color: '#cdd0d5',
                    padding: '8px 0 0',
                  }}
                >
                  {line}
                </pre>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
};

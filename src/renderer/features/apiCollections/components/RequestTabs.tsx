import React from 'react';

export interface RequestTabUiModel {
  id: string;
  title: string;
  collectionName: string;
  isDirty: boolean;
  isRunning: boolean;
}

interface RequestTabsProps {
  tabs: RequestTabUiModel[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}) => {
  if (tabs.length === 0) {
    return (
      <div
        style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          color: '#9ca3af',
          fontSize: '0.9rem',
        }}
      >
        Open a request from the left panel to start editing.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectTab(tab.id);
              }
            }}
            style={{
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              padding: '10px 16px',
              backgroundColor: isActive ? '#f8fafc' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
              minWidth: '200px',
            }}
          >
            <span>
              {tab.collectionName} / {tab.title}
            </span>
            {tab.isDirty && <span style={{ color: '#dc2626' }}>*</span>}
            {tab.isRunning && <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>sending…</span>}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '1rem',
                marginLeft: 'auto',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

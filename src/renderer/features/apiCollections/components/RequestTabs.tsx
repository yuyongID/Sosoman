import React from 'react';
import type { EnvironmentOption } from '../types';

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
  environment: string;
  environmentOptions: EnvironmentOption[];
  environmentSelectDisabled?: boolean;
  environmentPlaceholder?: string;
  onEnvironmentChange: (value: string) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  environment,
  environmentOptions,
  environmentSelectDisabled,
  environmentPlaceholder,
  onEnvironmentChange,
}) => {
  const tabsRef = React.useRef<HTMLDivElement | null>(null);
  const tabRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const prevTabCountRef = React.useRef<number>(tabs.length);

  const scrollTabsToEnd = React.useCallback(() => {
    const container = tabsRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
  }, []);

  const ensureActiveTabVisible = React.useCallback(() => {
    const container = tabsRef.current;
    if (!container || !activeTabId) {
      return;
    }
    const activeEl = tabRefs.current[activeTabId];
    if (!activeEl) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const offsetLeft = activeRect.left - containerRect.left;
    const offsetRight = activeRect.right - containerRect.left;
    const padding = 16;
    if (offsetLeft < padding) {
      container.scrollLeft += offsetLeft - padding;
    } else if (offsetRight > container.clientWidth - padding) {
      container.scrollLeft += offsetRight - container.clientWidth + padding;
    }
  }, [activeTabId]);

  React.useEffect(() => {
    const prevCount = prevTabCountRef.current;
    if (tabs.length > prevCount) {
      scrollTabsToEnd();
    } else {
      ensureActiveTabVisible();
    }
    prevTabCountRef.current = tabs.length;
  }, [tabs.length, activeTabId, ensureActiveTabVisible, scrollTabsToEnd]);

  React.useEffect(() => {
    const container = tabsRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      ensureActiveTabVisible();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ensureActiveTabVisible]);

  const handleTabWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = tabsRef.current;
    if (!container) {
      return;
    }
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  };

  const handleEnvironmentInteraction = () => {
    scrollTabsToEnd();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '0 6px',
        gap: '12px',
        minHeight: '44px',
        backgroundColor: '#1f1f24',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={tabsRef}
        className="tabs-scroll"
        onWheel={handleTabWheel}
        style={{
          display: 'flex',
          overflowX: 'auto',
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.length === 0 && (
          <div
            style={{
              color: '#9ca3af',
              fontSize: '0.9rem',
              padding: '12px 8px',
            }}
          >
            Open a request from the left panel to start editing.
          </div>
        )}
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
                borderBottom: isActive ? '2px solid #2190FF' : '2px solid transparent',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                minWidth: '160px',
                maxWidth: '220px',
                color: isActive ? '#ffffff' : '#cdd0d5',
                backgroundColor: isActive ? '#2a2d33' : 'transparent',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                fontSize: '0.85rem',
              }}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {tab.title}
              </span>
              {tab.isDirty && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f87171',
                    display: 'inline-block',
                  }}
                />
              )}
              {tab.isRunning && <span style={{ color: '#2190FF', fontSize: '0.8rem' }}>sending…</span>}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#9ca3af',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Env</span>
        <select
          aria-label="Environment selector"
          value={environment}
          onChange={(event) => onEnvironmentChange(event.target.value)}
          disabled={environmentSelectDisabled ?? environmentOptions.length === 0}
          onMouseDown={handleEnvironmentInteraction}
          onFocus={handleEnvironmentInteraction}
          style={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '0.85rem',
            backgroundColor: '#2a2d33',
            color: '#f3f4f6',
          }}
        >
          {(environmentOptions.length === 0 || environmentPlaceholder) && (
            <option value="">{environmentPlaceholder ?? '暂无可用环境'}</option>
          )}
          {environmentOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              title={option.disabled ? '生产环境不可选取' : option.description}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

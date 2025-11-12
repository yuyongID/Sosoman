import React, { type CSSProperties } from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface StatusBarSnapshot {
  connection: string;
  userLabel: string;
  lastRunLabel?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeNavId: string;
  onNavChange: (navId: string) => void;
  status: StatusBarSnapshot;
  statusBarActions?: React.ReactNode;
  headerActions?: React.ReactNode;
}

/**
 * Application shell honoring the README defined regions: appHeader, sideNav,
 * workbench (children slot) and statusBar.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navItems,
  activeNavId,
  onNavChange,
  status,
  statusBarActions,
  headerActions,
}) => {
  const headerStyle: CSSProperties & { WebkitAppRegion?: string } = {
    height: '34px',
    padding: '0 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b1b1f',
    WebkitAppRegion: 'drag',
    position: 'relative',
  };

  const headerActionsWrapper: CSSProperties & { WebkitAppRegion?: string } = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1f1f24',
        color: '#f3f4f6',
        margin: 0,
      }}
    >
      <header data-region="appHeader" style={headerStyle}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontWeight: 700,
            letterSpacing: '0.03em',
            pointerEvents: 'none',
          }}
        >
          Sosoman
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginLeft: 'auto',
          }}
        >
          {headerActions && (
            <div
              style={headerActionsWrapper}
            >
              {headerActions}
            </div>
          )}
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <nav
          data-region="sideNav"
          style={{
            width: '80px',
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
            backgroundColor: '#24262b',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              flex: 1,
            }}
          >
            {navItems.map((item) => {
              const isActive = item.id === activeNavId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavChange(item.id)}
                  style={{
                    width: '64px',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 4px',
                    background: isActive ? 'rgba(33, 144, 255, 0.15)' : 'transparent',
                    color: isActive ? '#ffffff' : '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 600 : 500,
                    boxShadow: isActive ? '0 0 0 1px rgba(33, 144, 255, 0.4)' : 'none',
                    transition: 'background 120ms ease',
                  }}
                >
                  {item.icon && <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        <main
          data-region="workbench"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            backgroundColor: '#1f1f24',
          }}
        >
          {children}
        </main>
      </div>
      <footer
        data-region="statusBar"
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          height: '26px',
          padding: '0 14px',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          color: '#9ca3af',
          backgroundColor: '#1b1b1f',
          lineHeight: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flex: 1,
            fontSize: '0.75rem',
          }}
        >
          <span>Connection: {status.connection}</span>
          <span>User: {status.userLabel}</span>
          <span>Last run: {status.lastRunLabel ?? '—'}</span>
        </div>
        {statusBarActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{statusBarActions}</div>
        )}
      </footer>
    </div>
  );
};

import React from 'react';

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
  workspaceName: string;
  environment: string;
  environmentOptions: string[];
  onEnvironmentChange: (env: string) => void;
  globalSearchTerm: string;
  onGlobalSearchChange: (value: string) => void;
  onRunClick: () => void;
  onSaveClick: () => void;
  status: StatusBarSnapshot;
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
  workspaceName,
  environment,
  environmentOptions,
  onEnvironmentChange,
  globalSearchTerm,
  onGlobalSearchChange,
  onRunClick,
  onSaveClick,
  status,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        data-region="appHeader"
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Sosoman Console</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#475569', fontSize: '0.9rem' }}>Workspace</span>
          <span style={{ fontWeight: 600 }}>{workspaceName}</span>
        </div>
        <select
          value={environment}
          onChange={(event) => onEnvironmentChange(event.target.value)}
          style={{
            border: '1px solid #cbd5f5',
            borderRadius: '6px',
            padding: '6px 10px',
            backgroundColor: '#fff',
          }}
        >
          {environmentOptions.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
        <input
          value={globalSearchTerm}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder="Global search"
          style={{
            flex: 1,
            maxWidth: '340px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '8px 12px',
          }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onRunClick}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Run
          </button>
          <button
            type="button"
            onClick={onSaveClick}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <nav
          data-region="sideNav"
          style={{
            width: '220px',
            borderRight: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
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
                  border: 'none',
                  background: isActive ? '#e0f2fe' : 'none',
                  color: isActive ? '#0f172a' : '#475569',
                  padding: '10px 24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <main
          data-region="workbench"
          style={{
            flex: 1,
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: '#fff',
              margin: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {children}
          </div>
        </main>
      </div>
      <footer
        data-region="statusBar"
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '8px 24px',
          fontSize: '0.85rem',
          display: 'flex',
          gap: '24px',
          color: '#475569',
          backgroundColor: '#f8fafc',
        }}
      >
        <span>Connection: {status.connection}</span>
        <span>User: {status.userLabel}</span>
        <span>Last run: {status.lastRunLabel ?? '—'}</span>
      </footer>
    </div>
  );
};

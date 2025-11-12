import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  ApiCollectionsWorkbench,
  type ApiCollectionsWorkbenchHandle,
  type ConnectionState,
} from '../features/apiCollections/ApiCollectionsWorkbench';
import { useSession } from '../store/sessionStore';

type NavKey = 'apiCollections' | 'environments' | 'testSuites';

const navItems = [
  { id: 'apiCollections', label: 'API collections', icon: '📚' },
  { id: 'environments', label: 'Environments', icon: '🌐' },
  { id: 'testSuites', label: 'Test suites', icon: '🧪' },
];

const connectionLabels: Record<ConnectionState, string> = {
  online: 'Online (mock data)',
  degraded: 'Syncing…',
  offline: 'Offline',
};

const PlaceholderView: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: '1rem',
    }}
  >
    {label} module is coming soon.
  </div>
);

export const App: React.FC = () => {
  const { token } = useSession();
  const [activeNav, setActiveNav] = React.useState<NavKey>('apiCollections');
  const [connectionState, setConnectionState] = React.useState<ConnectionState>('offline');
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null);
  const [consoleCount, setConsoleCount] = React.useState(0);
  const workbenchRef = React.useRef<ApiCollectionsWorkbenchHandle | null>(null);

  const handleConsoleToggle = React.useCallback(() => {
    workbenchRef.current?.toggleConsoleDrawer();
  }, []);

  const statusBar = React.useMemo(
    () => ({
      connection: connectionLabels[connectionState],
      userLabel: token ? 'Authenticated session' : 'Anonymous',
      lastRunLabel: lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : undefined,
    }),
    [connectionState, token, lastRunAt]
  );

  const statusBarActions = React.useMemo(
    () => (
      <button
        type="button"
        onClick={handleConsoleToggle}
        disabled={consoleCount === 0}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '4px 12px',
          backgroundColor: consoleCount ? '#111218' : 'transparent',
          color: consoleCount ? '#f3f4f6' : '#737d8a',
          cursor: consoleCount === 0 ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        Console
        {consoleCount > 0 && (
          <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>{consoleCount}</span>
        )}
      </button>
    ),
    [consoleCount, handleConsoleToggle]
  );

  return (
    <DashboardLayout
      navItems={navItems}
      activeNavId={activeNav}
      onNavChange={(value) => setActiveNav(value as NavKey)}
      workspaceName="Default workspace"
      status={statusBar}
      statusBarActions={statusBarActions}
    >
      {activeNav === 'apiCollections' && (
        <ApiCollectionsWorkbench
          ref={workbenchRef}
          onConnectionStateChange={setConnectionState}
          onRequestExecuted={setLastRunAt}
          onConsoleAvailabilityChange={setConsoleCount}
        />
      )}
      {activeNav === 'environments' && <PlaceholderView label="Environments" />}
      {activeNav === 'testSuites' && <PlaceholderView label="Test suites" />}
    </DashboardLayout>
  );
};

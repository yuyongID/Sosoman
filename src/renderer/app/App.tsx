import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ApiCollectionsWorkbench, type ConnectionState } from '../features/apiCollections/ApiCollectionsWorkbench';
import { useSession } from '../store/sessionStore';

type NavKey = 'apiCollections' | 'environments' | 'testSuites';

const navItems = [
  { id: 'apiCollections', label: 'API collections', icon: '📚' },
  { id: 'environments', label: 'Environments', icon: '🌐' },
  { id: 'testSuites', label: 'Test suites', icon: '🧪' },
];

const environmentOptions = ['Mock', 'Local', 'Staging', 'Production'];

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
  const [environment, setEnvironment] = React.useState(environmentOptions[0]);
  const [connectionState, setConnectionState] = React.useState<ConnectionState>('offline');
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null);

  const statusBar = React.useMemo(
    () => ({
      connection: connectionLabels[connectionState],
      userLabel: token ? 'Authenticated session' : 'Anonymous',
      lastRunLabel: lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : undefined,
    }),
    [connectionState, token, lastRunAt]
  );

  return (
    <DashboardLayout
      navItems={navItems}
      activeNavId={activeNav}
      onNavChange={(value) => setActiveNav(value as NavKey)}
      workspaceName="Default workspace"
      status={statusBar}
    >
      {activeNav === 'apiCollections' && (
        <ApiCollectionsWorkbench
          onConnectionStateChange={setConnectionState}
          onRequestExecuted={setLastRunAt}
          environment={environment}
          environmentOptions={environmentOptions}
          onEnvironmentChange={setEnvironment}
        />
      )}
      {activeNav === 'environments' && <PlaceholderView label="Environments" />}
      {activeNav === 'testSuites' && <PlaceholderView label="Test suites" />}
    </DashboardLayout>
  );
};

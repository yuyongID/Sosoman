import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  ApiCollectionsWorkbench,
  type ApiCollectionsWorkbenchHandle,
  type ConnectionState,
} from '../features/apiCollections/ApiCollectionsWorkbench';
import { LoginScreen } from '../features/auth/LoginScreen';
import { useLoginProfile } from '../features/auth/useLoginProfile';
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
  const { setToken } = useSession();
  const [activeNav, setActiveNav] = React.useState<NavKey>('apiCollections');
  const [connectionState, setConnectionState] = React.useState<ConnectionState>('offline');
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null);
  const [consoleCount, setConsoleCount] = React.useState(0);
  const workbenchRef = React.useRef<ApiCollectionsWorkbenchHandle | null>(null);
  const { profile, saveProfile } = useLoginProfile();
  const [loginVisible, setLoginVisible] = React.useState(() => profile === null);

  React.useEffect(() => {
    if (!profile) {
      setLoginVisible(true);
      setToken(null);
      return;
    }
    setToken(profile.selectedUser.account);
  }, [profile, setToken]);

  const handleAuthenticated = React.useCallback(
    (payload: Parameters<typeof saveProfile>[0]) => {
      saveProfile(payload);
      setLoginVisible(false);
    },
    [saveProfile]
  );

  const handleCancelLogin = React.useCallback(() => {
    if (profile) {
      setLoginVisible(false);
    }
  }, [profile]);

  const handleSwitchAccount = React.useCallback(() => {
    setLoginVisible(true);
  }, []);

  const handleConsoleToggle = React.useCallback(() => {
    workbenchRef.current?.toggleConsoleDrawer();
  }, []);

  const statusBar = React.useMemo(
    () => ({
      connection: connectionLabels[connectionState],
      userLabel: profile
        ? `${profile.selectedUser.name} (${profile.selectedUser.account})`
        : '待登录',
      lastRunLabel: lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : undefined,
    }),
    [connectionState, lastRunAt, profile]
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

  const headerActions = React.useMemo(
    () => (
      <button
        type="button"
        onClick={handleSwitchAccount}
        aria-label="切换账号"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backgroundColor: 'transparent',
          color: '#f3f4f6',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '0.95rem', lineHeight: 1 }}>
          👤
        </span>
      </button>
    ),
    [handleSwitchAccount]
  );

  if (loginVisible || !profile) {
    return (
      <LoginScreen
        initialKeyword={profile?.keyword}
        initialUser={profile?.selectedUser}
        allowCancel={Boolean(profile)}
        onCancel={handleCancelLogin}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <DashboardLayout
      navItems={navItems}
      activeNavId={activeNav}
      onNavChange={(value) => setActiveNav(value as NavKey)}
      status={statusBar}
      statusBarActions={statusBarActions}
      headerActions={headerActions}
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

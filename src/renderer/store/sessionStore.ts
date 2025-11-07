import React from 'react';

interface SessionState {
  token: string | null;
  setToken: (token: string | null) => void;
}

/**
 * Minimal session context demonstrating where authentication state can live.
 */
const SessionContext = React.createContext<SessionState | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = React.useState<string | null>(null);

  const value = React.useMemo(() => ({ token, setToken }), [token]);

  return React.createElement(SessionContext.Provider, { value }, children);
};

export function useSession(): SessionState {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return context;
}

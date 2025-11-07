import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Basic shell layout with top navigation placeholder.
 *
 * Replacing this layout in future should not impact feature modules as long as
 * the `children` slot remains intact.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
        }}
      >
        Sosoman Console
      </header>
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>{children}</main>
    </div>
  );
};

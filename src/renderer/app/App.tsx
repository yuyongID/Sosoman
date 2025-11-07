import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { CasesOverview } from '../features/cases/CasesOverview';

/**
 * Top-level application component.
 *
 * The component deliberately renders placeholder feature shells so that future
 * work can evolve each area without modifying the root.
 */
export const App: React.FC = () => {
  return (
    <DashboardLayout>
      <CasesOverview />
    </DashboardLayout>
  );
};

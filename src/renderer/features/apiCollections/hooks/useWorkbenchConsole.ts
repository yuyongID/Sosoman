import * as React from 'react';
import type { RequestTabState } from '../utils/requestTabs';

interface UseWorkbenchConsoleOptions {
  activeTab: RequestTabState | null;
  onConsoleAvailabilityChange?: (count: number) => void;
}

interface UseWorkbenchConsoleResult {
  consoleLines: string[];
  consoleDrawerOpen: boolean;
  toggleConsoleDrawer: () => void;
  closeConsoleDrawer: () => void;
  hasConsoleEntries: boolean;
}

/**
 * Derives console drawer state from the active tab response snapshot.
 *
 * Separating this concern reduces the amount of conditional rendering logic
 * embedded directly in the workbench component and improves cohesion by making
 * console behaviour self-contained.
 */
export function useWorkbenchConsole({
  activeTab,
  onConsoleAvailabilityChange,
}: UseWorkbenchConsoleOptions): UseWorkbenchConsoleResult {
  const consoleLines = React.useMemo(() => {
    const response = activeTab?.response;
    if (!response) {
      return [];
    }
    const logs = Array.isArray(response.consoleLog) ? response.consoleLog : [];
    const lines = [...logs];
    if (response.sosotestBody) {
      lines.push(JSON.stringify(response.sosotestBody, null, 2));
    }
    return lines;
  }, [activeTab?.response]);

  const hasConsoleEntries = consoleLines.length > 0;
  const [consoleDrawerOpen, setConsoleDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    onConsoleAvailabilityChange?.(consoleLines.length);
    if (!consoleLines.length) {
      setConsoleDrawerOpen(false);
    }
  }, [consoleLines.length, onConsoleAvailabilityChange]);

  const toggleConsoleDrawer = React.useCallback(() => {
    setConsoleDrawerOpen((prev) => {
      if (prev) {
        return false;
      }
      return hasConsoleEntries;
    });
  }, [hasConsoleEntries]);

  const closeConsoleDrawer = React.useCallback(() => {
    setConsoleDrawerOpen(false);
  }, []);

  return {
    consoleLines,
    consoleDrawerOpen,
    toggleConsoleDrawer,
    closeConsoleDrawer,
    hasConsoleEntries,
  };
}

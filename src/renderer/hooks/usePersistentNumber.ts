import * as React from 'react';

/**
 * Persists a numeric value to localStorage so layout preferences survive reloads.
 *
 * The hook keeps knowledge about the storage side-effect out of components, so
 * they can focus on rendering concerns.
 */
export function usePersistentNumber(key: string, defaultValue: number): [number, (value: number) => void] {
  const [value, setValue] = React.useState<number>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue];
}

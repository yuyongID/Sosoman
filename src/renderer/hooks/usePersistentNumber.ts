import * as React from 'react';

const canUseDOM = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Persists a numeric value to localStorage so layout preferences survive reloads.
 *
 * The hook keeps knowledge about the storage side-effect out of components, so
 * they can focus on rendering concerns.
 */
export function usePersistentNumber(
  key: string,
  defaultValue: number
): [number, React.Dispatch<React.SetStateAction<number>>, boolean] {
  const hasStoredValueRef = React.useRef(false);
  const [value, setValue] = React.useState<number>(() => {
    if (!canUseDOM()) {
      return defaultValue;
    }
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      hasStoredValueRef.current = true;
      return parsed;
    }
    return defaultValue;
  });
  const skipInitialPersistRef = React.useRef(!hasStoredValueRef.current);

  React.useEffect(() => {
    if (!canUseDOM()) {
      return;
    }
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      if (!hasStoredValueRef.current) {
        // Avoid persisting the default sentinel so we can detect "no stored value" downstream.
        return;
      }
    }
    window.localStorage.setItem(key, String(value));
    hasStoredValueRef.current = true;
  }, [key, value]);

  return [value, setValue, hasStoredValueRef.current];
}

export function usePersistentString(
  key: string,
  defaultValue: string
): [string, React.Dispatch<React.SetStateAction<string>>] {
  const hasStoredValueRef = React.useRef(false);
  const [value, setValue] = React.useState<string>(() => {
    if (!canUseDOM()) {
      return defaultValue;
    }
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    hasStoredValueRef.current = true;
    return stored;
  });
  const skipInitialPersistRef = React.useRef(!hasStoredValueRef.current);

  React.useEffect(() => {
    if (!canUseDOM()) {
      return;
    }
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      if (!hasStoredValueRef.current) {
        // Avoid persisting the default sentinel so we can detect "no stored value" downstream.
        return;
      }
    }
    window.localStorage.setItem(key, value);
    hasStoredValueRef.current = true;
  }, [key, value]);

  return [value, setValue];
}

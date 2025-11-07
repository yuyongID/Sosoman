import { useEffect, useRef } from 'react';

/**
 * Basic polling helper hook.
 *
 * Consumers can control the polling cadence and termination condition. The
 * implementation keeps side-effects isolated, simplifying unit testing.
 */
export function usePolling(callback: () => void, intervalMs: number, isActive: boolean) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(callback, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callback, intervalMs, isActive]);
}

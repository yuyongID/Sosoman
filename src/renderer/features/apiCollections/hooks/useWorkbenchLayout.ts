import * as React from 'react';
import { usePersistentNumber, usePersistentString } from '@renderer/hooks/usePersistentNumber';

export const MIN_REQUEST_PANEL_HEIGHT = 200;
export const MIN_RESPONSE_PANEL_HEIGHT = 200;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type FullscreenPanel = 'none' | 'request' | 'response';

interface UseWorkbenchLayoutResult {
  sidebarWidth: number;
  handleSidebarResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  contentAreaRef: React.RefObject<HTMLDivElement>;
  responsePanelHeight: number;
  handleResponseResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  isRequestPanelFullscreen: boolean;
  isResponsePanelFullscreen: boolean;
  isAnyPanelFullscreen: boolean;
  togglePanelFullscreen: (panel: Exclude<FullscreenPanel, 'none'>) => void;
}

/**
 * Encapsulates all layout-related state for the API collections workbench.
 *
 * Keeping layout concerns in a dedicated hook prevents the main component from
 * juggling DOM measurements alongside data orchestration, which improves
 * cohesion and makes the layout logic easier to reuse and test.
 */
export function useWorkbenchLayout(): UseWorkbenchLayoutResult {
  const [sidebarWidth, setSidebarWidth] = usePersistentNumber('apiCollections.sidebarWidth', 280);
  const [responsePanelHeight, setResponsePanelHeight, responseHeightStored] =
    usePersistentNumber('apiCollections.responseHeight', 0);
  const [fullScreenPanel, setFullScreenPanel] = usePersistentString('apiCollections.panelFullscreen', 'none');
  const contentAreaRef = React.useRef<HTMLDivElement | null>(null);
  const [contentAreaHeight, setContentAreaHeight] = React.useState(0);
  const responseHeightInitializedRef = React.useRef(responseHeightStored);

  React.useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const node = contentAreaRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setContentAreaHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const applyResponsePanelHeight = React.useCallback(
    (nextHeight: number) => {
      if (!contentAreaHeight) {
        setResponsePanelHeight(Math.max(MIN_RESPONSE_PANEL_HEIGHT, nextHeight));
        return;
      }
      const maxAllowed = Math.max(
        MIN_RESPONSE_PANEL_HEIGHT,
        contentAreaHeight - MIN_REQUEST_PANEL_HEIGHT
      );
      const clampedHeight = clamp(nextHeight, MIN_RESPONSE_PANEL_HEIGHT, maxAllowed);
      setResponsePanelHeight(clampedHeight);
    },
    [contentAreaHeight, setResponsePanelHeight]
  );

  React.useEffect(() => {
    if (!contentAreaHeight) {
      return;
    }
    if (!responseHeightInitializedRef.current) {
      responseHeightInitializedRef.current = true;
      applyResponsePanelHeight(Math.round(contentAreaHeight / 2));
      return;
    }
    applyResponsePanelHeight(responsePanelHeight);
  }, [contentAreaHeight, responsePanelHeight, applyResponsePanelHeight]);

  const togglePanelFullscreen = React.useCallback(
    (panel: Exclude<FullscreenPanel, 'none'>) => {
      setFullScreenPanel((prev) => (prev === panel ? 'none' : panel));
    },
    [setFullScreenPanel]
  );

  const handleSidebarResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setSidebarWidth(clamp(startWidth + delta, 200, 420));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  const handleResponseResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (fullScreenPanel !== 'none') {
        return;
      }
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = responsePanelHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        applyResponsePanelHeight(startHeight - delta);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [fullScreenPanel, responsePanelHeight, applyResponsePanelHeight]
  );

  return {
    sidebarWidth,
    handleSidebarResizeStart,
    contentAreaRef,
    responsePanelHeight,
    handleResponseResizeStart,
    isRequestPanelFullscreen: fullScreenPanel === 'request',
    isResponsePanelFullscreen: fullScreenPanel === 'response',
    isAnyPanelFullscreen: fullScreenPanel !== 'none',
    togglePanelFullscreen,
  };
}

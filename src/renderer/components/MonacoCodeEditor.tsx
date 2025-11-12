import React from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';

declare global {
  interface Window {
    MonacoEnvironment?: {
      onUnexpectedError?: (error: unknown) => void;
      [key: string]: unknown;
    };
    __sosomanMonacoErrorGuardInstalled?: boolean;
  }
}

const THEME_ID = 'sosoman-dark';

const isCancellationError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  if (error instanceof Error) {
    return error.message.includes('Canceled');
  }
  if (typeof error === 'string') {
    return error.includes('Canceled');
  }
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message).includes('Canceled');
  }
  return false;
};

const installMonacoErrorGuard = () => {
  if (typeof window === 'undefined' || window.__sosomanMonacoErrorGuardInstalled) {
    return;
  }
  const previousHandler = window.MonacoEnvironment?.onUnexpectedError;
  window.MonacoEnvironment = {
    ...(window.MonacoEnvironment ?? {}),
    onUnexpectedError: (error: unknown) => {
      if (isCancellationError(error)) {
        return;
      }
      if (typeof previousHandler === 'function') {
        previousHandler(error);
        return;
      }
      if (error instanceof Error) {
        console.error(error);
      } else {
        console.error('Monaco unexpected error', error);
      }
    },
  };
  window.__sosomanMonacoErrorGuardInstalled = true;
};

installMonacoErrorGuard();

const defineTheme = (monaco: Monaco) => {
  monaco.editor.defineTheme(THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '#6b7280', fontStyle: 'italic' },
      { token: 'comment.python', foreground: '#6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '#8ab4f8' },
      { token: 'keyword.python', foreground: '#8ab4f8' },
      { token: 'string', foreground: '#f9a8d4' },
      { token: 'string.python', foreground: '#f9a8d4' },
      { token: 'number', foreground: '#fcd34d' },
      { token: 'number.python', foreground: '#fcd34d' },
      { token: 'delimiter.python', foreground: '#94a3b8' },
      { token: 'type.python', foreground: '#c4b5fd' },
      { token: 'identifier.python', foreground: '#e2e8f0' },
      { token: 'operator.python', foreground: '#94a3b8' },
      { token: 'predefined.python', foreground: '#bef264' },
    ],
    colors: {
      'editor.background': '#0f1115',
      'editor.foreground': '#e2e8f0',
      'editor.lineHighlightBackground': '#1d1f26',
      'editorCursor.foreground': '#f8fafc',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#cbd5f5',
      'editor.selectionBackground': '#1f3a5f',
      'editorWidget.background': '#1a1c23',
      'dropdown.background': '#1a1c23',
      'dropdown.border': '#2a2d33',
      'list.hoverBackground': '#1f2933',
      'list.activeSelectionBackground': '#2a2d33',
      'scrollbarSlider.background': '#37415166',
      'scrollbarSlider.hoverBackground': '#4b556380',
    },
  });
};

export interface MonacoCodeEditorProps {
  value: string;
  language: string;
  placeholder?: string;
  readOnly?: boolean;
  folding?: boolean;
  minHeight?: number;
  height?: number | string;
  onChange?: (value: string) => void;
  options?: MonacoEditor.IStandaloneEditorConstructionOptions;
  autoFormat?: boolean;
  ariaLabel?: string;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  value,
  language,
  placeholder,
  readOnly = false,
  folding = true,
  minHeight = 160,
  height = '100%',
  onChange,
  options,
  autoFormat = true,
  ariaLabel,
}) => {
  const themeDefinedRef = React.useRef(false);

  const handleMount: OnMount = React.useCallback(
    (editorInstance, monaco) => {
      if (!themeDefinedRef.current) {
        defineTheme(monaco);
        themeDefinedRef.current = true;
      }
      monaco.editor.setTheme(THEME_ID);
      if (autoFormat) {
        const formatPromise = editorInstance.getAction('editor.action.formatDocument')?.run();
        if (formatPromise && typeof formatPromise.catch === 'function') {
          formatPromise.catch((error) => {
            if (!isCancellationError(error)) {
              console.warn('[MonacoCodeEditor] 自动格式化失败', error);
            }
          });
        }
      }
    },
    [autoFormat]
  );

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight,
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#0f1115',
      }}
    >
      {!value && placeholder ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 14,
            color: '#6b7280',
            pointerEvents: 'none',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            zIndex: 1,
          }}
        >
          {placeholder}
        </div>
      ) : null}
      <Editor
        value={value}
        defaultLanguage={language}
        language={language}
        theme={THEME_ID}
        onChange={(nextValue) => onChange?.(nextValue ?? '')}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: true,
          folding,
          lineNumbers: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          ...options,
        }}
        height={height}
        width="100%"
        aria-label={ariaLabel}
      />
    </div>
  );
};

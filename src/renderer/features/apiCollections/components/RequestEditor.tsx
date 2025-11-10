import React from 'react';
import type { ApiRequestDefinition, HttpMethod } from '@shared/models/apiCollection';
import { KeyValueEditor } from './KeyValueEditor';

type SectionKey = 'params' | 'headers' | 'body' | 'pre' | 'post';

const methodOptions: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const methodAccent: Record<HttpMethod, string> = {
  GET: '#4ade80',
  POST: '#2190FF',
  PUT: '#f97316',
  PATCH: '#facc15',
  DELETE: '#f87171',
};

interface RequestEditorProps {
  request: ApiRequestDefinition;
  isRunning: boolean;
  isSaving: boolean;
  isDirty: boolean;
  isHydrating: boolean;
  hydrationError?: string;
  saveError?: string;
  onChange: (nextRequest: ApiRequestDefinition) => void;
  onRun: () => void;
  onSave: () => void;
  onRetryHydration?: () => void;
}

const sectionLabels: Record<SectionKey, string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  pre: 'Pre-script',
  post: 'Post-script',
};

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  isRunning,
  isSaving,
  isDirty,
  isHydrating,
  hydrationError,
  saveError,
  onChange,
  onRun,
  onSave,
  onRetryHydration,
}) => {
  const [activeSection, setActiveSection] = React.useState<SectionKey>('params');
  const [methodMenuOpen, setMethodMenuOpen] = React.useState(false);
  const methodMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setActiveSection('params');
  }, [request.id]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (methodMenuRef.current && !methodMenuRef.current.contains(event.target as Node)) {
        setMethodMenuOpen(false);
      }
    };
    if (methodMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [methodMenuOpen]);

  React.useEffect(() => {
    if (isHydrating && methodMenuOpen) {
      setMethodMenuOpen(false);
    }
  }, [isHydrating, methodMenuOpen]);

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...request, url: event.target.value });
  };

  const handleBodyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...request, body: event.target.value });
  };

  const handleParamsChange = (nextRows: ApiRequestDefinition['params']) => {
    onChange({ ...request, params: nextRows });
  };

  const handleHeadersChange = (nextRows: ApiRequestDefinition['headers']) => {
    onChange({ ...request, headers: nextRows });
  };

  const handleScriptChange = (field: 'preScript' | 'postScript', value: string) => {
    onChange({ ...request, [field]: value });
  };

  const applyMethod = (method: HttpMethod) => {
    onChange({ ...request, method });
    setMethodMenuOpen(false);
  };

  const renderSection = (): React.ReactNode => {
    switch (activeSection) {
      case 'params':
        return (
          <KeyValueEditor
            rows={request.params}
            emptyLabel="No query parameters configured."
            onChange={handleParamsChange}
          />
        );
      case 'headers':
        return (
          <KeyValueEditor
            rows={request.headers}
            emptyLabel="No headers configured."
            onChange={handleHeadersChange}
          />
        );
      case 'body':
        return (
          <textarea
            value={request.body}
            onChange={handleBodyChange}
            placeholder="Raw JSON body"
            style={{
              width: '100%',
              minHeight: '220px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              backgroundColor: '#1f1f24',
              color: '#f3f4f6',
            }}
          />
        );
      case 'pre':
        return (
          <textarea
            value={request.preScript ?? ''}
            onChange={(event) => handleScriptChange('preScript', event.target.value)}
            placeholder="// pre-script to run before request"
            style={{
              width: '100%',
              minHeight: '220px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              backgroundColor: '#0f1115',
              color: '#f3f4f6',
            }}
          />
        );
      case 'post':
        return (
          <textarea
            value={request.postScript ?? ''}
            onChange={(event) => handleScriptChange('postScript', event.target.value)}
            placeholder="// post-script to run after response"
            style={{
              width: '100%',
              minHeight: '220px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              backgroundColor: '#0f1115',
              color: '#f3f4f6',
            }}
          />
        );
      default:
        return null;
    }
  };

  if (hydrationError) {
    return (
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2a2d33',
          borderRadius: '10px',
          height: '100%',
        }}
      >
        <div style={{ textAlign: 'center', color: '#f87171', maxWidth: '420px', padding: '12px' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>API 详情加载失败</p>
          <p style={{ color: '#cdd0d5', fontSize: '0.9rem', marginTop: '6px' }}>{hydrationError}</p>
          {onRetryHydration && (
            <button
              type="button"
              onClick={onRetryHydration}
              style={{
                marginTop: '16px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2190FF',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              重新加载
            </button>
          )}
        </div>
      </section>
    );
  }

  const sendDisabled = isHydrating || isRunning;
  const saveDisabled = isHydrating || isSaving || !isDirty;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#2a2d33',
        borderRadius: '10px',
        padding: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        color: '#f3f4f6',
        height: '100%',
        position: 'relative',
      }}
    >
      <header style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div ref={methodMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              if (!isHydrating) {
                setMethodMenuOpen((prev) => !prev);
              }
            }}
            disabled={isHydrating}
            style={{
              padding: '8px 12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              fontWeight: 600,
              backgroundColor: '#1f1f24',
              color: methodAccent[request.method],
              cursor: isHydrating ? 'not-allowed' : 'pointer',
              opacity: isHydrating ? 0.6 : 1,
              minWidth: '90px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span>{request.method}</span>
            <span style={{ color: '#cdd0d5', fontSize: '0.8rem' }}>▾</span>
          </button>
          {methodMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                backgroundColor: '#1f1f24',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                zIndex: 10,
                minWidth: '120px',
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
              }}
            >
              {methodOptions.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => applyMethod(method)}
                  style={{
                    border: 'none',
                    background: method === request.method ? 'rgba(33, 144, 255, 0.15)' : 'transparent',
                    color: methodAccent[method],
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {method}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          value={request.url}
          onChange={handleUrlChange}
          placeholder="https://api.sosotest.dev/path"
          disabled={isHydrating}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            backgroundColor: '#1f1f24',
            color: '#f3f4f6',
            opacity: isHydrating ? 0.5 : 1,
          }}
        />
        <button
          type="button"
          onClick={onRun}
          disabled={sendDisabled}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: sendDisabled ? 'rgba(33, 144, 255, 0.4)' : '#2190FF',
            color: '#ffffff',
            cursor: sendDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {isRunning ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: saveDisabled ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: '#f3f4f6',
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
            opacity: saveDisabled ? 0.6 : 1,
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </header>
      {saveError && (
        <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '-4px' }}>{saveError}</p>
      )}

      <div>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {(Object.keys(sectionLabels) as SectionKey[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              style={{
                border: 'none',
                borderBottom: activeSection === section ? '2px solid #2190FF' : '2px solid transparent',
                background: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                fontWeight: activeSection === section ? 600 : 500,
                color: activeSection === section ? '#ffffff' : '#cdd0d5',
              }}
            >
              {sectionLabels[section]}
            </button>
          ))}
        </div>
        <div style={{ paddingTop: '16px' }}>{renderSection()}</div>
      </div>
      {isHydrating && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '10px',
            backgroundColor: 'rgba(15, 17, 21, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#cdd0d5',
            fontWeight: 600,
          }}
        >
          <span>正在同步 API 详情…</span>
        </div>
      )}
    </section>
  );
};

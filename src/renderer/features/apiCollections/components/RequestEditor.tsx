import React from 'react';
import type { ApiRequestDefinition, HttpMethod } from '@shared/models/apiCollection';
import { KeyValueEditor } from './KeyValueEditor';
import type { EnvironmentOption } from '../types';

type SectionKey = 'params' | 'headers' | 'body' | 'pre' | 'post';

const methodOptions: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const methodAccent: Record<HttpMethod, string> = {
  GET: '#4ade80',
  POST: '#2190FF',
  PUT: '#f97316',
  PATCH: '#facc15',
  DELETE: '#f87171',
};

const SURFACE_COLOR = '#1d1f26';

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
  isRunReady: boolean;
  runReadyMessage?: string;
  environmentOptions: EnvironmentOption[];
  environmentDisabled: boolean;
  environmentPlaceholder: string;
  selectedEnvironmentKey?: string | null;
  selectedEnvironmentLabel?: string;
  selectedEnvironmentRequestAddr?: string;
  onEnvironmentChange: (value: string) => void;
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
  isRunReady,
  runReadyMessage,
  environmentOptions,
  environmentDisabled,
  environmentPlaceholder,
  selectedEnvironmentKey,
  selectedEnvironmentLabel,
  selectedEnvironmentRequestAddr,
  onEnvironmentChange,
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

  const [envMenuOpen, setEnvMenuOpen] = React.useState(false);
  const envMenuRef = React.useRef<HTMLDivElement | null>(null);
  const envButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        envMenuOpen &&
        envMenuRef.current &&
        !envMenuRef.current.contains(event.target as Node) &&
        envButtonRef.current &&
        !envButtonRef.current.contains(event.target as Node)
      ) {
        setEnvMenuOpen(false);
      }
    };
    if (envMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [envMenuOpen]);

  React.useEffect(() => {
    if (environmentDisabled || environmentOptions.length === 0) {
      setEnvMenuOpen(false);
    }
  }, [environmentDisabled, environmentOptions.length]);

  const toggleEnvironmentMenu = () => {
    if (environmentDisabled || environmentOptions.length === 0) {
      return;
    }
    setEnvMenuOpen((prev) => !prev);
  };

  const handleEnvironmentOptionClick = (option: EnvironmentOption) => {
    if (option.disabled) {
      return;
    }
    onEnvironmentChange(option.value);
    setEnvMenuOpen(false);
  };

  const environmentButtonLabel = selectedEnvironmentRequestAddr || environmentPlaceholder;

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

  const renderTextEditor = (
    value: string,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void,
    placeholder: string,
    backgroundColor: string
  ) => (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <textarea
        className="dark-scrollbar"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          height: '100%',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '0.95rem',
          backgroundColor,
          color: '#f3f4f6',
          boxSizing: 'border-box',
          resize: 'none',
          scrollbarColor: '#4b5563 transparent',
        }}
      />
    </div>
  );

  const renderSection = (): React.ReactNode => {
    switch (activeSection) {
      case 'params':
        return (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <KeyValueEditor
              rows={request.params}
              emptyLabel=""
              onChange={handleParamsChange}
            />
          </div>
        );
      case 'headers':
        return (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <KeyValueEditor
              rows={request.headers}
              emptyLabel="暂无 Header 配置"
              onChange={handleHeadersChange}
            />
          </div>
        );
      case 'body':
        return renderTextEditor(request.body, handleBodyChange, 'Raw JSON body', SURFACE_COLOR);
      case 'pre':
        return renderTextEditor(
          request.preScript ?? '',
          (event) => handleScriptChange('preScript', event.target.value),
          '// pre-script to run before request',
          SURFACE_COLOR
        );
      case 'post':
        return renderTextEditor(
          request.postScript ?? '',
          (event) => handleScriptChange('postScript', event.target.value),
          '// post-script to run after response',
          SURFACE_COLOR
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

  const sendDisabled = isHydrating || isRunning || !isRunReady;
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
                zIndex: 9999,
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
        <div style={{ position: 'relative' }}>
          <button
            ref={envButtonRef}
            type="button"
            onClick={toggleEnvironmentMenu}
            disabled={environmentDisabled || environmentOptions.length === 0}
            aria-haspopup="menu"
            aria-expanded={envMenuOpen}
            title={environmentPlaceholder}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '8px',
              backgroundColor: '#111218',
              color: '#f3f4f6',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              cursor: environmentDisabled || environmentOptions.length === 0 ? 'not-allowed' : 'pointer',
              minWidth: '220px',
              width: 'auto',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#f3f4f6',
                whiteSpace: 'nowrap',
              }}
            >
              {environmentButtonLabel}
            </span>
            <span style={{ color: '#cdd0d5', fontSize: '0.8rem' }}>▾</span>
          </button>
          {envMenuOpen && (
            <div
              className="dark-scrollbar"
              ref={envMenuRef}
              role="menu"
              aria-label="环境切换列表"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  minWidth: '320px',
                  width: 'max-content',
                  maxWidth: '70vw',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  backgroundColor: '#1d1f26',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
                  zIndex: 9999,
                }}
            >
              {environmentOptions.length === 0 ? (
                <div style={{ padding: '12px', color: '#cdd0d5', fontSize: '0.85rem' }}>
                  {environmentPlaceholder}
                </div>
              ) : (
                environmentOptions.map((option) => {
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleEnvironmentOptionClick(option)}
                      disabled={option.disabled}
                      title={option.disabled ? '生产环境不可选取' : option.description}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: option.value === selectedEnvironmentKey ? 'rgba(33, 144, 255, 0.12)' : 'transparent',
                        color: option.disabled ? '#7c8798' : '#f3f4f6',
                        padding: '10px 14px',
                        cursor: option.disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: option.disabled ? '#9ca3af' : '#f3f4f6',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.requestAddr ?? option.label}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: option.disabled ? '#9ca3af' : '#cdd0d5',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.value}
                </span>
                    </button>
                  );
                })
              )}
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
            minWidth: 0,
            maxWidth: '100%',
            padding: '10px 12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            backgroundColor: '#1f1f24',
            color: '#f3f4f6',
            opacity: isHydrating ? 0.5 : 1,
            boxSizing: 'border-box',
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
      {!isRunReady && runReadyMessage && (
        <p style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '-2px' }}>{runReadyMessage}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
        <div
          style={{
            paddingTop: '16px',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderSection()}
        </div>
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

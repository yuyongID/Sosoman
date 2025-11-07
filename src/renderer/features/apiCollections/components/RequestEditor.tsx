import React from 'react';
import type { ApiRequestDefinition, HttpMethod } from '@shared/models/apiCollection';
import { KeyValueEditor } from './KeyValueEditor';

type SectionKey = 'params' | 'headers' | 'body' | 'tests';

const methodOptions: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface RequestEditorProps {
  request: ApiRequestDefinition;
  isRunning: boolean;
  onChange: (nextRequest: ApiRequestDefinition) => void;
  onRun: () => void;
  onSave: () => void;
}

const sectionLabels: Record<SectionKey, string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  tests: 'Tests',
};

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  isRunning,
  onChange,
  onRun,
  onSave,
}) => {
  const [activeSection, setActiveSection] = React.useState<SectionKey>('params');

  React.useEffect(() => {
    setActiveSection('params');
  }, [request.id]);

  const handleMethodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...request, method: event.target.value as HttpMethod });
  };

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

  const handleTestChange = (testId: string, field: 'name' | 'script', value: string) => {
    const nextTests = request.tests.map((test) =>
      test.id === testId ? { ...test, [field]: value } : test
    );
    onChange({ ...request, tests: nextTests });
  };

  const handleRemoveTest = (testId: string) => {
    onChange({ ...request, tests: request.tests.filter((test) => test.id !== testId) });
  };

  const handleAddTest = () => {
    onChange({
      ...request,
      tests: [
        ...request.tests,
        {
          id: `test-${Date.now()}`,
          name: 'New assertion',
          script: '// TODO: add Vitest assertions',
        },
      ],
    });
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
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
            }}
          />
        );
      case 'tests':
        if (request.tests.length === 0) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#6b7280' }}>No tests defined for this request.</p>
              <button
                type="button"
                onClick={handleAddTest}
                style={{
                  width: 'fit-content',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px dashed #9ca3af',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                + Add test snippet
              </button>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {request.tests.map((test) => (
              <div
                key={test.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={test.name}
                    onChange={(event) => handleTestChange(test.id, 'name', event.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTest(test.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={test.script}
                  onChange={(event) => handleTestChange(test.id, 'script', event.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddTest}
              style={{
                width: 'fit-content',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px dashed #9ca3af',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              + Add test snippet
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <header style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          value={request.method}
          onChange={handleMethodChange}
          style={{
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontWeight: 600,
          }}
        >
          {methodOptions.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <input
          value={request.url}
          onChange={handleUrlChange}
          placeholder="https://api.sosotest.dev/path"
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
          }}
        />
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isRunning ? '#93c5fd' : '#2563eb',
            color: '#fff',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          onClick={onSave}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </header>

      <div>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e5e7eb' }}>
          {(Object.keys(sectionLabels) as SectionKey[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              style={{
                border: 'none',
                borderBottom: activeSection === section ? '2px solid #2563eb' : '2px solid transparent',
                background: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                fontWeight: activeSection === section ? 600 : 500,
              }}
            >
              {sectionLabels[section]}
            </button>
          ))}
        </div>
        <div style={{ paddingTop: '16px' }}>{renderSection()}</div>
      </div>
    </section>
  );
};

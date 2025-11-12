import React from 'react';
import type { KeyValuePair } from '@shared/models/apiCollection';

interface KeyValueEditorProps {
  rows: KeyValuePair[];
  emptyLabel: string;
  onChange: (nextRows: KeyValuePair[]) => void;
}

const PLACEHOLDER_ROW_ID = 'kv-placeholder-row';

const createRow = (): KeyValuePair => ({
  id: `kv-${Date.now()}-${Math.round(Math.random() * 10_000)}`,
  key: '',
  value: '',
  enabled: true,
});

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ rows, emptyLabel, onChange }) => {
  const [pendingRow, setPendingRow] = React.useState({ key: '', value: '' });
  const [placeholderTick, setPlaceholderTick] = React.useState(0);
  const placeholderRowRef = React.useRef<HTMLTableRowElement | null>(null);

  const handleUpdate = (rowId: string, field: 'key' | 'value', value: string) => {
    const nextRows = rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
    onChange(nextRows);
  };

  const handleToggle = (rowId: string) => {
    if (rowId.startsWith(PLACEHOLDER_ROW_ID)) {
      return;
    }
    const nextRows = rows.map((row) => (row.id === rowId ? { ...row, enabled: !row.enabled } : row));
    onChange(nextRows);
  };

  const handleRemove = (rowId: string) => {
    if (rowId.startsWith(PLACEHOLDER_ROW_ID)) {
      return;
    }
    onChange(rows.filter((row) => row.id !== rowId));
  };

  const commitPendingRow = () => {
    const trimmedKey = pendingRow.key.trim();
    const trimmedValue = pendingRow.value.trim();
    if (trimmedKey === '' && trimmedValue === '') {
      return;
    }
    const nextRow = createRow();
    nextRow.key = pendingRow.key;
    nextRow.value = pendingRow.value;
    onChange([...rows, nextRow]);
    setPendingRow({ key: '', value: '' });
    setPlaceholderTick((prev) => prev + 1);
  };

  const handlePlaceholderChange = (field: 'key' | 'value', value: string) => {
    setPendingRow((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlaceholderBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && placeholderRowRef.current?.contains(nextTarget)) {
      return;
    }
    commitPendingRow();
  };

  const handlePlaceholderKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitPendingRow();
    }
  };

  const placeholderRow: KeyValuePair = {
    id: `${PLACEHOLDER_ROW_ID}-${placeholderTick}`,
    key: pendingRow.key,
    value: pendingRow.value,
    enabled: true,
  };

  const displayRows = [...rows, placeholderRow];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: 0 }}>
      <div
        className="dark-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          backgroundColor: '#1d1f26',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'auto',
            minWidth: 0,
            fontSize: '0.85rem',
            lineHeight: 1.35,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  width: '70px',
                }}
              >
                启用
              </th>
              <th
                className="kv-key-column"
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                Key
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                Value
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  width: '80px',
                }}
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {emptyLabel && rows.length === 0 && pendingRow.key === '' && pendingRow.value === '' && (
              <tr>
                <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#7c8798' }}>
                  {emptyLabel}
                </td>
              </tr>
            )}
            {displayRows.map((row) => {
              const isPlaceholder = row.id.startsWith(PLACEHOLDER_ROW_ID);
              return (
                <tr
                  key={row.id}
                  ref={isPlaceholder ? placeholderRowRef : null}
                  className={`kv-row${isPlaceholder ? ' kv-placeholder-row' : ''}`}
                  style={{ transition: 'background 160ms ease' }}
                >
                  <td
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {!isPlaceholder && (
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={() => handleToggle(row.id)}
                        title="Toggle row"
                        className="themed-checkbox"
                      />
                    )}
                  </td>
                  <td
                    className="kv-key-column"
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      verticalAlign: 'middle',
                    }}
                  >
                    <input
                      value={row.key}
                      onChange={(event) =>
                        isPlaceholder
                          ? handlePlaceholderChange('key', event.target.value)
                          : handleUpdate(row.id, 'key', event.target.value)
                      }
                      placeholder={isPlaceholder ? '输入 Key' : 'Key'}
                      onBlur={isPlaceholder ? handlePlaceholderBlur : undefined}
                      onKeyDown={isPlaceholder ? handlePlaceholderKeyDown : undefined}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.8rem',
                      }}
                      className="kv-input"
                    />
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      verticalAlign: 'middle',
                    }}
                  >
                    <input
                      value={row.value}
                      onChange={(event) =>
                        isPlaceholder
                          ? handlePlaceholderChange('value', event.target.value)
                          : handleUpdate(row.id, 'value', event.target.value)
                      }
                      placeholder={isPlaceholder ? '输入 Value' : 'Value'}
                      onBlur={isPlaceholder ? handlePlaceholderBlur : undefined}
                      onKeyDown={isPlaceholder ? handlePlaceholderKeyDown : undefined}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.8rem',
                      }}
                      className="kv-input"
                    />
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      textAlign: 'center',
                      width: '80px',
                    }}
                  >
                    {!isPlaceholder && (
                      <button
                        type="button"
                        onClick={() => handleRemove(row.id)}
                        className="kv-delete-btn"
                        aria-label="删除该行"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 7h16" />
                          <path d="M9 7V5h6v2" />
                          <path d="M6 7l.5 11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1L18 7" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

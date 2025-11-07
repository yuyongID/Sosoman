import React from 'react';
import type { KeyValuePair } from '@shared/models/apiCollection';

interface KeyValueEditorProps {
  rows: KeyValuePair[];
  emptyLabel: string;
  onChange: (nextRows: KeyValuePair[]) => void;
}

const createRow = (): KeyValuePair => ({
  id: `kv-${Date.now()}-${Math.round(Math.random() * 10_000)}`,
  key: '',
  value: '',
  enabled: true,
});

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ rows, emptyLabel, onChange }) => {
  const handleUpdate = (rowId: string, field: 'key' | 'value', value: string) => {
    const nextRows = rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
    onChange(nextRows);
  };

  const handleToggle = (rowId: string) => {
    const nextRows = rows.map((row) => (row.id === rowId ? { ...row, enabled: !row.enabled } : row));
    onChange(nextRows);
  };

  const handleRemove = (rowId: string) => {
    onChange(rows.filter((row) => row.id !== rowId));
  };

  const handleAdd = () => {
    onChange([...rows, createRow()]);
  };

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{emptyLabel}</p>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            width: 'fit-content',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            background: 'transparent',
            color: '#f3f4f6',
            cursor: 'pointer',
          }}
        >
          + Add row
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr 1fr 40px',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={() => handleToggle(row.id)}
            title="Toggle row"
          />
          <input
            value={row.key}
            onChange={(event) => handleUpdate(row.id, 'key', event.target.value)}
            placeholder="Key"
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#0f1115',
              color: '#f3f4f6',
            }}
          />
          <input
            value={row.value}
            onChange={(event) => handleUpdate(row.id, 'value', event.target.value)}
            placeholder="Value"
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#0f1115',
              color: '#f3f4f6',
            }}
          />
          <button
            type="button"
            onClick={() => handleRemove(row.id)}
            style={{
              border: 'none',
              background: 'none',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        style={{
          width: 'fit-content',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px dashed rgba(255, 255, 255, 0.2)',
          background: 'transparent',
          color: '#f3f4f6',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        + Add row
      </button>
    </div>
  );
};

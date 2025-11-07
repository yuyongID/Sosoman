import React from 'react';
import { useEffect } from 'react';
import { listTestCases } from '../../../api/cases';
import type { TestCase } from '../../../shared/models/testCase';

/**
 * Presentation-only container that demonstrates how feature modules can keep
 * data-fetching concerns close to their UI.
 */
export const CasesOverview: React.FC = () => {
  const [cases, setCases] = React.useState<TestCase[]>([]);

  useEffect(() => {
    // Fetching is intentionally naive until the data layer is formalised.
    listTestCases()
      .then(setCases)
      .catch((error) => {
        console.error('[cases] Failed to load test cases', error);
      });
  }, []);

  return (
    <section>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Test Cases</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Placeholder list to validate the renderer pipeline. Replace with real table or
        virtualised list as needed.
      </p>
      <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
        {cases.map((item) => (
          <li
            key={item.id}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 16px',
            }}
          >
            <strong>{item.name}</strong>
            <p style={{ margin: '4px 0 0', color: '#6b7280' }}>{item.description}</p>
          </li>
        ))}
        {cases.length === 0 && <li>No cases loaded yet.</li>}
      </ul>
    </section>
  );
};

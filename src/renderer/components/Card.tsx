import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Simple reusable card primitive used across feature modules.
 */
export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <section
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <header style={{ fontWeight: 600 }}>{title}</header>
      <div>{children}</div>
    </section>
  );
};

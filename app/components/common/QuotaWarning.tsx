"use client";

import { useState } from 'react';

interface QuotaWarningProps {
  show: boolean;
}

export function QuotaWarning({ show }: QuotaWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  return (
    <div style={{
      background: 'rgba(255, 165, 0, 0.1)',
      border: '1px solid rgba(255, 165, 0, 0.3)',
      color: 'var(--text-primary)',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px'
    }}>
      <span>⚠️ Some movie details are temporarily unavailable due to API rate limits — try refreshing shortly.</span>
      <button 
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px'
        }}
        aria-label="Dismiss warning"
      >
        ✕
      </button>
    </div>
  );
}

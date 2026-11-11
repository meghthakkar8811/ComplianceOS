import React from 'react';

export default function PaginationBar({ page, pageSize, totalCount, itemCount, onPageChange }) {
  const effectiveTotal = totalCount ?? itemCount;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  if (effectiveTotal <= pageSize && page === 0) return null;

  const start = itemCount === 0 ? 0 : page * pageSize + 1;
  const end = page * pageSize + itemCount;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text2)',
        fontFamily: 'var(--mono)',
      }}
    >
      <span>
        Showing {start}–{end} of {effectiveTotal}
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn-ghost"
          style={{ padding: '4px 10px', fontSize: '11px' }}
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          ← Prev
        </button>
        <span>
          Page {page + 1} / {totalPages}
        </span>
        <button
          className="btn-ghost"
          style={{ padding: '4px 10px', fontSize: '11px' }}
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}


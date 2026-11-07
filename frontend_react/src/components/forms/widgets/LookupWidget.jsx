import React, { useState, useEffect, useRef, useCallback } from 'react';
import { catalogSearch } from '../../../services/api';

const SEARCH_DEBOUNCE_MS = 300;
const CLOSE_DELAY_MS = 150;

function displayName(item) {
  if (!item) return '';
  return item.name || item.label || item.id || '';
}

/**
 * A debounced async catalog lookup: types into a text input, searches the given asset type by
 * name as you type, and picks a result from the dropdown to store its id as the field's value.
 * The input shows the picked entity's display name when idle, and a fresh search box while
 * focused.
 */
export function LookupWidget({ value, onChange, assetType, disabled, placeholder }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState('');
  const debounceRef = useRef(null);
  const resolvedForId = useRef(null);

  // Resolve the current id's display name, e.g. when the field already holds a value on mount
  // (edit/view mode) rather than from a selection made in this widget.
  useEffect(() => {
    if (!value) {
      setResolvedLabel('');
      resolvedForId.current = null;
      return;
    }
    if (value === resolvedForId.current) return;
    let cancelled = false;
    catalogSearch(assetType, { filter: { field: 'id', op: 'EQ', values: [value] } })
      .then((res) => {
        if (cancelled) return;
        const match = (res.items || [])[0];
        resolvedForId.current = value;
        setResolvedLabel(displayName(match) || value);
      })
      .catch(() => {
        if (!cancelled) setResolvedLabel(value);
      });
    return () => {
      cancelled = true;
    };
  }, [value, assetType]);

  const search = useCallback(
    (text) => {
      if (!text) {
        setOptions([]);
        return;
      }
      catalogSearch(assetType, { filter: { field: 'name', op: 'CONTAINS', values: [text] } })
        .then((res) => setOptions(res.items || []))
        .catch(() => setOptions([]));
    },
    [assetType]
  );

  const handleChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), SEARCH_DEBOUNCE_MS);
  };

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setOptions([]);
  };

  const handleBlur = () => {
    window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const handleSelect = (item) => {
    resolvedForId.current = item.id;
    setResolvedLabel(displayName(item));
    onChange(item.id);
    setQuery('');
    setOptions([]);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? query : resolvedLabel}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
      />
      {open && options.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            maxHeight: '220px',
            overflowY: 'auto',
            marginTop: '2px',
          }}
        >
          {options.map((item) => (
            <div
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              style={{ padding: '8px 11px', cursor: 'pointer', fontSize: '13px' }}
            >
              {displayName(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

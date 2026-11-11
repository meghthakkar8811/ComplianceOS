import React, { useState, useEffect, useRef, useCallback } from 'react';
import { catalogSearch } from '../../../services/api';

const SEARCH_DEBOUNCE_MS = 250;
const CLOSE_DELAY_MS = 150;

function displayName(item) {
  if (!item) return '';
  return item.name || item.mineral || item.label || item.id || '';
}

function searchFieldFor(assetType) {
  if (assetType === 'Mineral') return 'mineral';
  return 'name';
}

/**
 * A debounced async catalog lookup: types into a text input (or opens all options on focus),
 * searches the given asset type with its scoped `lookupOptions`, and stores the selected item's
 * id as the field's value.
 */
export function LookupWidget({ value, onChange, assetType, lookupOptions, disabled, placeholder }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState('');
  const debounceRef = useRef(null);
  const resolvedKeyRef = useRef(null);
  const optionsKey = JSON.stringify(lookupOptions || {});

  useEffect(() => {
    if (!value) {
      setResolvedLabel('');
      resolvedKeyRef.current = null;
      return;
    }
    const key = `${value}|${optionsKey}`;
    if (key === resolvedKeyRef.current) return;
    let cancelled = false;
    catalogSearch(assetType, { filter: { field: 'id', op: 'EQ', values: [value] } }, lookupOptions)
      .then((res) => {
        if (cancelled) return;
        const match = (res.items || [])[0];
        resolvedKeyRef.current = key;
        setResolvedLabel(displayName(match) || value);
      })
      .catch(() => {
        if (!cancelled) setResolvedLabel(value);
      });
    return () => {
      cancelled = true;
    };
  }, [value, assetType, optionsKey]);

  const search = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      // MineralGradeAssetHandler filters in memory and ignores query.filter; MineralAssetHandler
      // without mineId returns the platform catalog unfiltered. Query with empty filter when text is
      // blank (or for MineralGrade), and refine locally where handlers don't evaluate filter.
      const useServerFilter = Boolean(trimmed) && assetType !== 'MineralGrade';
      const searchQuery = useServerFilter
        ? { filter: { field: searchFieldFor(assetType), op: 'CONTAINS', values: [trimmed] } }
        : {};
      catalogSearch(assetType, searchQuery, lookupOptions)
        .then((res) => {
          let items = res?.items || [];
          if (trimmed && !useServerFilter) {
            const needle = trimmed.toLowerCase();
            items = items.filter((item) => displayName(item).toLowerCase().includes(needle));
          } else if (trimmed && assetType === 'Mineral' && !lookupOptions?.mineId) {
            const needle = trimmed.toLowerCase();
            items = items.filter((item) => displayName(item).toLowerCase().includes(needle));
          }
          setOptions(items);
        })
        .catch(() => setOptions([]));
    },
    [assetType, optionsKey]
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
    search('');
  };

  const handleBlur = () => {
    window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const handleSelect = (item) => {
    resolvedKeyRef.current = `${item.id}|${optionsKey}`;
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
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
            >
              {displayName(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../services/api';
import { getValueByPointer, setValueByPointer } from '../lib/jsonPointer';
import { evaluateRule } from '../lib/jsonLogic';

const DEFAULT_STEP = '__default__';
const DEFAULT_SECTION = '__default__';

function leafPropertyName(pointer) {
  const lastSlash = pointer.lastIndexOf('/');
  return lastSlash === -1 ? pointer : pointer.slice(lastSlash + 1);
}

/**
 * Resolves a layout field's effective visible/enabled/required state for the current form data.
 * Visible/enabled come from the backend's pre-resolved per-mode access level (`currentAccess`:
 * READ_ONLY, EDITABLE or REQUIRED — a field is never present at all once the backend resolves it
 * to HIDDEN for the requested mode). Required-ness comes from the JSON Schema's own `required`
 * list instead — the backend builds that list from `@UiAccess` alone (never from
 * `@NotBlank`/`@NotNull`, a data-layer constraint this UI-only schema doesn't consult), so it is
 * the single source of truth for which fields the form must demand a value for. `@UiRule`s can
 * still override any of the three based on live form data.
 */
function fieldAccess(pointer, field, formData, schemaRequired) {
  let visible = true;
  let enabled = field.currentAccess !== 'READ_ONLY';
  let required = schemaRequired.has(leafPropertyName(pointer));

  for (const rule of field.rules || []) {
    const matches = evaluateRule(rule.expr, formData);
    if (rule.effect === 'VISIBLE') visible = matches;
    else if (rule.effect === 'ENABLED') enabled = matches;
    else if (rule.effect === 'REQUIRED') required = matches || required;
  }

  return { visible, enabled, required };
}

function isEmptyValue(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * Fetches and drives a schema-driven form for one asset type and mode.
 *
 * Returns:
 * - `schema`/`layout`: the raw `{schema, layout}` response from `GET /v1/schemas/{assetType}`.
 * - `loading`/`error`: fetch state.
 * - `formData`: the pointer-addressed form state, matching the submit payload shape exactly.
 * - `setFieldValue(pointer, value)`: immutable update of one field.
 * - `steps`: fields grouped by step then section, in `order`, each entry carrying its resolved
 *   `access` (`{visible, enabled, required}`) alongside the raw layout field and its `pointer`.
 *   Only fields with a `widget` are included.
 * - `errors`: a pointer-keyed map of validation messages, populated by `validate()`.
 * - `validate()`: runs required/empty validation over every currently visible field, updates
 *   `errors`, and returns whether the form is valid.
 */
export function useSchemaForm({ assetType, mode, initialData }) {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(() => initialData || {});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(`/schemas/${assetType}?mode=${mode}`)
      .then((response) => {
        if (cancelled) return;
        setDefinition(response);
        setFormData(initialData ? { ...initialData } : {});
        setErrors({});
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // initialData is captured at fetch time, not watched, so switching records re-fetches via
    // assetType/mode; callers editing a different record while staying on the same asset type
    // and mode should remount the form (e.g. by key) rather than relying on this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, mode]);

  const setFieldValue = useCallback((pointer, value) => {
    setFormData((prev) => setValueByPointer(prev, pointer, value));
  }, []);

  const steps = useMemo(() => {
    const fields = definition?.layout?.fields || {};
    const schemaRequired = new Set(definition?.schema?.required || []);
    const stepVsSections = new Map();

    for (const [pointer, field] of Object.entries(fields)) {
      if (!field || !field.widget) continue;
      const stepId = field.step || DEFAULT_STEP;
      const sectionId = field.section || DEFAULT_SECTION;
      if (!stepVsSections.has(stepId)) stepVsSections.set(stepId, new Map());
      const sections = stepVsSections.get(stepId);
      if (!sections.has(sectionId)) sections.set(sectionId, []);
      sections.get(sectionId).push({ pointer, field, access: fieldAccess(pointer, field, formData, schemaRequired) });
    }

    const stepMeta = new Map((definition?.layout?.steps || []).map((step) => [step.id, step]));

    return Array.from(stepVsSections.entries())
      .sort(([a], [b]) => (stepMeta.get(a)?.order ?? 0) - (stepMeta.get(b)?.order ?? 0))
      .map(([stepId, sections]) => ({
        id: stepId === DEFAULT_STEP ? null : stepId,
        label: stepMeta.get(stepId)?.label || null,
        sections: Array.from(sections.entries()).map(([sectionId, sectionFields]) => ({
          id: sectionId === DEFAULT_SECTION ? null : sectionId,
          fields: sectionFields.sort((a, b) => (a.field.order ?? 100) - (b.field.order ?? 100)),
        })),
      }));
  }, [definition, formData]);

  const validate = useCallback(() => {
    const nextErrors = {};
    for (const step of steps) {
      for (const section of step.sections) {
        for (const { pointer, field, access } of section.fields) {
          if (!access.visible || !access.required) continue;
          if (isEmptyValue(getValueByPointer(formData, pointer))) {
            nextErrors[pointer] = `${field.label} is required.`;
          }
        }
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [steps, formData]);

  return {
    schema: definition?.schema || null,
    layout: definition?.layout || null,
    loading,
    error,
    formData,
    setFieldValue,
    errors,
    validate,
    steps,
  };
}

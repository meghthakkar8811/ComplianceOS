import React from 'react';
import { useSchemaForm } from '../../hooks/useSchemaForm';
import { getValueByPointer } from '../../lib/jsonPointer';
import { LookupWidget } from './widgets/LookupWidget';

function toDateInputValue(millis) {
  if (!millis) return '';
  return new Date(millis).toISOString().slice(0, 10);
}

function fromDateInputValue(dateString) {
  return dateString ? new Date(dateString).getTime() : null;
}

function resolveLookupOptions(lookup, formData) {
  if (!lookup?.options) return undefined;
  const resolved = {};
  for (const [key, expr] of Object.entries(lookup.options)) {
    const pointer =
      typeof expr === 'string' && expr.startsWith('$.')
        ? '/' + expr.slice(2).replace(/\./g, '/')
        : expr;
    const val = getValueByPointer(formData, pointer);
    if (val !== undefined && val !== null && val !== '') {
      resolved[key] = String(val);
    }
  }
  return Object.keys(resolved).length ? resolved : undefined;
}

/** Renders one layout field as its widget, wired to the hook's form state. */
function Field({ pointer, field, access, formData, setFieldValue, error }) {
  if (!access.visible) return null;

  const value = getValueByPointer(formData, pointer);
  const disabled = !access.enabled;
  const onChange = (nextValue) => setFieldValue(pointer, nextValue);

  let input;
  switch (field.widget) {
    case 'TEXTAREA':
      input = (
        <textarea
          rows={field.rows || 4}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'NUMBER':
      input = (
        <input
          type="number"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
      break;
    case 'DATE':
      input = (
        <input
          type="date"
          value={toDateInputValue(value)}
          disabled={disabled}
          onChange={(e) => onChange(fromDateInputValue(e.target.value))}
        />
      );
      break;
    case 'SWITCH':
      input = (
        <input
          type="checkbox"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
      break;
    case 'SELECT':
      input = (
        <select value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Select…
          </option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
      break;
    case 'LOOKUP':
      input = (
        <LookupWidget
          value={value}
          onChange={onChange}
          assetType={field.lookup?.assetType}
          lookupOptions={resolveLookupOptions(field.lookup, formData)}
          disabled={disabled}
          placeholder={`Search ${field.label}…`}
        />
      );
      break;
    case 'DYNAMIC_SCHEMA':
      input = <div className="field-unsupported">Unsupported field type.</div>;
      break;
    case 'TEXT':
    default:
      input = (
        <input
          type="text"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
  }

  return (
    <div className="fg">
      <label>
        {field.label}
        {access.required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {input}
      {error && <div style={{ color: 'var(--red)', fontSize: '11.5px', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

/**
 * Renders a schema-driven form for one asset type and mode, fetched via `useSchemaForm`.
 * Fields are grouped by step then section and rendered in `order`. `onSubmit(formData)` is
 * called with the pointer-addressed form data only once `validate()` passes.
 */
export function SchemaForm({ assetType, mode, initialData, onSubmit, onCancel, submitLabel }) {
  const { loading, error, formData, setFieldValue, errors, validate, steps } = useSchemaForm({
    assetType,
    mode,
    initialData,
  });

  if (loading) return <div className="fg">Loading form…</div>;
  if (error) return <div style={{ color: 'var(--red)' }}>Failed to load form: {error.message}</div>;

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <div>
      {steps.map((step) => (
        <div key={step.id || 'default'}>
          {step.label && <h4>{step.label}</h4>}
          {step.sections.map((section) => (
            <div key={section.id || 'default'} className="pfc-grid">
              {section.fields.map(({ pointer, field, access }) => (
                <Field
                  key={pointer}
                  pointer={pointer}
                  field={field}
                  access={access}
                  formData={formData}
                  setFieldValue={setFieldValue}
                  error={errors[pointer]}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
      <div className="pfc-actions">
        {onCancel && (
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn-primary" onClick={handleSubmit}>
          {submitLabel || 'Save'}
        </button>
      </div>
    </div>
  );
}

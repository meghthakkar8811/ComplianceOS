import jsonLogic from 'json-logic-js';

/**
 * Evaluates a JsonLogic rule expression (as sent in a schema-form layout field's `rules[].expr`)
 * against the current form data. `var` references inside the expression are resolved against
 * `formData` directly, so a rule referencing a sibling field uses that field's plain name.
 * Returns `true` when there is no expression to evaluate, or when evaluation fails.
 */
export function evaluateRule(expr, formData) {
  if (!expr) return true;
  try {
    return !!jsonLogic.apply(expr, formData || {});
  } catch {
    return true;
  }
}

/**
 * Format a quantity value for display.
 * - Strips trailing zeros: 2.000 → "2", 1.500 → "1.5", 2.5 → "2.5"
 * - Returns "—" for null/undefined/0 when showZero is false
 */
export function formatQty(val: number | null | undefined, showZero = false): string {
  if (val === null || val === undefined) return '—';
  if (val === 0) return showZero ? '0' : '—';
  // parseFloat strips trailing zeros automatically
  return parseFloat(val.toFixed(3)).toString();
}

/**
 * Format a rate (currency) value.
 */
export function formatRate(val: number | null | undefined): string {
  if (!val) return '—';
  return `₹${parseFloat(val.toFixed(2))}`;
}

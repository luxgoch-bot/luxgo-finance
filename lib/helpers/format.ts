/**
 * Swiss number formatting utilities
 * Swiss convention: 1'234.56 (apostrophe thousands, dot decimal)
 */

/**
 * Format a number as CHF with Swiss conventions
 * e.g. 1234.56 → "CHF 1'234.56"
 */
export function formatChf(amount: number | null | undefined): string {
  if (amount == null) return 'CHF 0.00'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number with Swiss thousands separator
 * e.g. 1234567.89 → "1'234'567.89"
 */
export function formatNumber(amount: number | null | undefined, decimals = 2): string {
  if (amount == null) return '0.00'
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Format as compact CHF (no currency symbol, Swiss formatting)
 * e.g. 1234.56 → "1'234.56"
 */
export function formatChfCompact(amount: number | null | undefined): string {
  if (amount == null) return '0.00'
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parse a Swiss-formatted number string back to a number
 * e.g. "1'234.56" → 1234.56
 */
export function parseSwissNumber(value: string): number {
  // Remove apostrophe thousands separator, keep dot as decimal
  const cleaned = value.replace(/'/g, '').replace(/\s/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Format a date string to Swiss date format
 * e.g. "2024-03-15" → "15.03.2024"
 */
export function formatDateCh(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format a date to ISO date string (YYYY-MM-DD) from a Date object
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

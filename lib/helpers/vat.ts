// Swiss VAT (MWST) Calculation Utilities

export const VAT_RATES = {
  standard: 8.1,   // Standard rate (2024)
  reduced: 2.6,    // Reduced rate (food, books, etc.)
  special: 3.8,    // Special rate (accommodation)
  zero: 0,         // Zero-rated (exports, etc.)
} as const

export type VatRate = keyof typeof VAT_RATES

/**
 * Calculate VAT amount from a gross (including VAT) amount
 */
export function vatFromGross(grossAmount: number, rate: number = VAT_RATES.standard): number {
  return grossAmount - grossAmount / (1 + rate / 100)
}

/**
 * Calculate VAT amount from a net (excluding VAT) amount
 */
export function vatFromNet(netAmount: number, rate: number = VAT_RATES.standard): number {
  return netAmount * (rate / 100)
}

/**
 * Calculate net amount from gross
 */
export function netFromGross(grossAmount: number, rate: number = VAT_RATES.standard): number {
  return grossAmount / (1 + rate / 100)
}

/**
 * Calculate gross amount from net
 */
export function grossFromNet(netAmount: number, rate: number = VAT_RATES.standard): number {
  return netAmount * (1 + rate / 100)
}

/**
 * Format a CHF amount with Swiss formatting
 */
export function formatChf(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calculate VAT payable for a period (collected - paid on expenses)
 */
export function calculateVatPayable(vatCollected: number, vatPaidOnExpenses: number): number {
  return Math.max(0, vatCollected - vatPaidOnExpenses)
}

/**
 * Get quarter dates for a given year and quarter
 */
export function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0), // Last day of last month in quarter
  }
}

/**
 * MWST effective rate method (Saldosteuersatz) for passenger transport
 * Transport companies may use a flat rate instead of full accounting.
 * Typical rate for passenger transport: 3.8%
 */
export function calculateSaldosteuersatz(revenue: number, rate: number = 3.8): number {
  return revenue * (rate / 100)
}

// Swiss VAT (MWST) Calculation Utilities

// ==========================================
// Swiss VAT Rates 2024
// ==========================================
export const VAT_RATES = {
  standard: 8.1,   // Standard rate — most goods & services
  reduced:  2.6,   // Reduced rate — food, books, medicine
  special:  3.8,   // Special rate — accommodation
  zero:     0,     // Zero-rated — exports, etc.
} as const

export type VatRateKey = keyof typeof VAT_RATES

// ==========================================
// Core Calculation Functions
// ==========================================

/**
 * calculateVAT — compute VAT amount from a net (excl. VAT) amount
 * e.g. calculateVAT(1000, 8.1) → 81
 */
export function calculateVAT(amount: number, rate: number = VAT_RATES.standard): number {
  return Math.round(amount * (rate / 100) * 100) / 100
}

/**
 * extractVAT — extract VAT from a gross (incl. VAT) amount
 * e.g. extractVAT(1081, 8.1) → 81
 */
export function extractVAT(grossAmount: number, rate: number = VAT_RATES.standard): number {
  return Math.round((grossAmount - grossAmount / (1 + rate / 100)) * 100) / 100
}

/**
 * getNetAmount — get the net (excl. VAT) from a gross (incl. VAT) amount
 * e.g. getNetAmount(1081, 8.1) → 1000
 */
export function getNetAmount(gross: number, rate: number = VAT_RATES.standard): number {
  return Math.round((gross / (1 + rate / 100)) * 100) / 100
}

/**
 * getGrossAmount — add VAT to a net amount to get gross
 * e.g. getGrossAmount(1000, 8.1) → 1081
 */
export function getGrossAmount(netAmount: number, rate: number = VAT_RATES.standard): number {
  return Math.round(netAmount * (1 + rate / 100) * 100) / 100
}

// ==========================================
// Aliases (backward-compat + convenience)
// ==========================================

/** @alias calculateVAT */
export const vatFromNet = calculateVAT

/** @alias extractVAT */
export const vatFromGross = extractVAT

/** @alias getNetAmount */
export const netFromGross = getNetAmount

/** @alias getGrossAmount */
export const grossFromNet = getGrossAmount

// ==========================================
// Formatting
// ==========================================

/**
 * Format a CHF amount using Swiss locale
 */
export function formatChf(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ==========================================
// Reporting Utilities
// ==========================================

/**
 * Calculate net VAT payable (collected − paid on expenses)
 * Result is floored at 0 — if negative, it means a refund is due
 */
export function calculateVatPayable(vatCollected: number, vatPaidOnExpenses: number): number {
  return Math.max(0, Math.round((vatCollected - vatPaidOnExpenses) * 100) / 100)
}

/**
 * Get start/end dates for a given year + quarter
 */
export function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0),
  }
}

/**
 * Saldosteuersatz — flat-rate MWST method for passenger transport
 * Typical approved rate: 3.8% on total revenue
 * Use this instead of full accounting if ESTV approved it for LuxGo
 */
export function calculateSaldosteuersatz(revenue: number, rate: number = 3.8): number {
  return Math.round(revenue * (rate / 100) * 100) / 100
}

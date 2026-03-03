// Swiss Tax Estimation Utilities
// ⚠️ These are approximations only — not a substitute for professional tax advice.

/**
 * Swiss federal tax brackets 2024 (single)
 * Source: ESTV / Eidgenössische Steuerverwaltung
 */
export const FEDERAL_TAX_BRACKETS_SINGLE_2024 = [
  { min: 0,      max: 14500,  rate: 0 },
  { min: 14500,  max: 31600,  rate: 0.77 },
  { min: 31600,  max: 41400,  rate: 0.88 },
  { min: 41400,  max: 55200,  rate: 2.64 },
  { min: 55200,  max: 72500,  rate: 2.97 },
  { min: 72500,  max: 78100,  rate: 5.94 },
  { min: 78100,  max: 103600, rate: 6.6 },
  { min: 103600, max: 134600, rate: 8.8 },
  { min: 134600, max: 176000, rate: 11.0 },
  { min: 176000, max: 755200, rate: 13.2 },
  { min: 755200, max: Infinity, rate: 11.5 },
] as const

/**
 * Estimate federal income tax (simplified progressive calculation)
 */
export function estimateFederalTax(taxableIncome: number): number {
  let tax = 0
  for (const bracket of FEDERAL_TAX_BRACKETS_SINGLE_2024) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxableInBracket * (bracket.rate / 100)
  }
  return Math.round(tax * 100) / 100
}

/**
 * AHV/IV/EO contributions (self-employed) 2024
 * Rate: 10.0% on net income above minimum threshold
 */
export function calculateAhvContribution(netIncome: number): number {
  const AHV_RATE = 0.10
  const MIN_INCOME = 9800 // Minimum insurable income 2024
  if (netIncome < MIN_INCOME) return 0
  return Math.round(netIncome * AHV_RATE * 100) / 100
}

/**
 * Approximate canton tax multipliers (Steuerfuss)
 * Used for rough estimation of cantonal + municipal tax burden
 */
export const CANTON_MULTIPLIERS: Record<string, number> = {
  ZH: 1.15,
  ZG: 0.80,
  GE: 0.455,
  BS: 0.79,
  BL: 0.775,
  AG: 1.10,
  BE: 1.60,
  LU: 1.60,
  SG: 1.25,
  TG: 1.17,
  TI: 0.90,
  VS: 1.30,
  NE: 1.55,
  FR: 1.35,
  VD: 1.535,
  SO: 1.08,
  GR: 1.00,
  AR: 0.86,
  AI: 0.70,
  SH: 0.70,
  GL: 0.70,
  UR: 0.64,
  SZ: 0.595,
  OW: 0.625,
  NW: 0.605,
}

/**
 * Rough total tax estimate (federal + cantonal + municipal)
 * ⚠️ Approximation only — not tax advice
 */
export function estimateTotalTax(
  taxableIncome: number,
  canton: string = 'ZH',
  municipalMultiplier: number = 1.19
): {
  federal: number
  cantonal: number
  estimated_total: number
  effective_rate: number
} {
  const federal = estimateFederalTax(taxableIncome)
  const cantonMultiplier = CANTON_MULTIPLIERS[canton] ?? 1.0
  const cantonal = federal * cantonMultiplier * municipalMultiplier

  const estimated_total = Math.round((federal + cantonal) * 100) / 100
  const effective_rate = taxableIncome > 0 ? (estimated_total / taxableIncome) * 100 : 0

  return {
    federal: Math.round(federal * 100) / 100,
    cantonal: Math.round(cantonal * 100) / 100,
    estimated_total,
    effective_rate: Math.round(effective_rate * 100) / 100,
  }
}

/**
 * Calculate total deductible expenses
 */
export function calculateDeductibleExpenses(
  expenses: Array<{ amount_chf: number; is_deductible: boolean }>
): number {
  return expenses
    .filter(e => e.is_deductible)
    .reduce((sum, e) => sum + e.amount_chf, 0)
}

/**
 * Net profit calculation
 */
export function calculateNetProfit(totalRevenue: number, totalDeductibleExpenses: number): number {
  return Math.max(0, totalRevenue - totalDeductibleExpenses)
}

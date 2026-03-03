/**
 * Swiss Personal Income Tax Estimator — Zurich (ZH) 2024
 *
 * ⚠️ ESTIMATION ONLY — always verify with the official Zurich tax calculator
 * at https://www.zh.ch/de/steuern-finanzen/steuern/steuerberechnung.html
 *
 * Tax components:
 * 1. Federal direct tax (DBSt) — progressive scale
 * 2. Zurich cantonal tax — progressive scale × Steuerfuss 1.0 (cantonal unit)
 * 3. Zurich city municipal tax — cantonal × Steuerfuss 119%
 *
 * Standard deductions 2024 (Zurich):
 * - 3. Säule A: max CHF 7,258 (employed) / CHF 36,288 (self-employed, 20% of net income)
 * - Work expenses: flat CHF 2,000 (Berufskosten Pauschale) or actual
 * - Transport: public transport actual or car 0.70 CHF/km (max CHF 3,000 Bund / up to CHF 5,000 Zurich)
 * - Health insurance premiums: partial deduction depending on situation
 * - Donations: actual, min CHF 100
 * - Childcare (Drittbetreuungskosten): up to CHF 10,100
 */

export interface PersonalDeductions {
  saeule3a:          number  // 3rd pillar A contributions (max 7,258 for 2024)
  workExpensesFlat:  boolean // use flat CHF 2,000 vs actual
  workExpensesActual: number // if not using flat rate
  transportOv:       number  // public transport actual cost (CHF)
  transportKm:       number  // car km to work (deducted at CHF 0.70/km, max CHF 5k ZH)
  healthInsurance:   number  // health insurance premiums paid
  donations:         number  // charitable donations (min CHF 100)
  childcare:         number  // 3rd-party childcare costs
  otherDeductions:   number  // any other deductible items
}

export interface PersonalIncome {
  salaryGross:       number  // Employment income (Lohn)
  sideIncome:        number  // Other income (Nebenerwerb)
  investmentIncome:  number  // Dividends, interest
  otherIncome:       number  // Any other taxable income
}

export interface PersonalTaxResult {
  totalIncome:       number
  totalDeductions:   number
  taxableIncome:     number
  federalTax:        number
  cantonalTax:       number
  municipalTax:      number
  totalTax:          number
  effectiveRate:     number
  marginalRate:      number  // approximate
  disclaimer:        string
  deductionBreakdown: Record<string, number>
}

// ── Deduction limits 2024 ────────────────────────────────────────────────
export const DEDUCTION_LIMITS_2024 = {
  saeule3a_employed:       7258,   // max 3rd pillar for employed persons
  saeule3a_selfEmployed:   36288,  // max 3rd pillar for self-employed (20% of net)
  workExpensesFlat:        2000,   // Berufskosten Pauschale
  transportKmRate:         0.70,   // CHF per km
  transportMax_fed:        3000,   // federal max car deduction
  transportMax_zh:         5000,   // Zurich cantonal max car deduction
  childcareMax:            10100,  // max childcare deduction (ZH)
  donationsMin:            100,    // minimum qualifying donation
} as const

// ── Federal income tax brackets 2024 (single, CHF) ──────────────────────
// Source: ESTV — Tarif für natürliche Personen 2024
const FEDERAL_BRACKETS_SINGLE: Array<[number, number, number]> = [
  // [from, to, rate%]
  [0,       14500,  0    ],
  [14500,   31600,  0.77 ],
  [31600,   41400,  0.88 ],
  [41400,   55200,  2.64 ],
  [55200,   72500,  2.97 ],
  [72500,   78100,  5.94 ],
  [78100,   103600, 6.60 ],
  [103600,  134600, 8.80 ],
  [134600,  176000, 11.00],
  [176000,  755200, 13.20],
  [755200,  Infinity, 11.50],
]

// ── Zurich cantonal brackets 2024 (simplified unit tax, before Steuerfuss) ─
// Source: Steuergesetz Kanton Zürich (simplified approximation)
const ZH_CANTONAL_BRACKETS: Array<[number, number, number]> = [
  [0,       6700,   0    ],
  [6700,    11500,  2.00 ],
  [11500,   16200,  3.00 ],
  [16200,   22100,  4.00 ],
  [22100,   28300,  5.00 ],
  [28300,   36700,  6.00 ],
  [36700,   46700,  7.00 ],
  [46700,   56700,  8.00 ],
  [56700,   70300,  9.00 ],
  [70300,   90300,  10.00],
  [90300,   127900, 11.00],
  [127900,  Infinity, 13.00],
]

// Zurich Steuerfuss 2024
export const ZH_CANTONAL_STEUERFUSS  = 1.0   // canton = 100%
export const ZH_CITY_STEUERFUSS      = 1.19  // Zurich city = 119% of cantonal unit

function computeProgressiveTax(
  income:   number,
  brackets: Array<[number, number, number]>
): number {
  let tax = 0
  for (const [from, to, rate] of brackets) {
    if (income <= from) break
    const taxableInBracket = Math.min(income, to) - from
    tax += taxableInBracket * (rate / 100)
  }
  return Math.round(tax * 100) / 100
}

function getMarginalRate(
  income:   number,
  brackets: Array<[number, number, number]>
): number {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income >= brackets[i][0]) return brackets[i][2]
  }
  return 0
}

/**
 * Compute total personal deductions from inputs
 */
export function computeDeductions(
  d: PersonalDeductions,
  selfEmployed = false
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {}

  // 3. Säule
  const saeule3aMax = selfEmployed ? DEDUCTION_LIMITS_2024.saeule3a_selfEmployed : DEDUCTION_LIMITS_2024.saeule3a_employed
  const saeule3a    = Math.min(d.saeule3a, saeule3aMax)
  if (saeule3a > 0) breakdown['3. Säule A'] = saeule3a

  // Work expenses
  const workExp = d.workExpensesFlat
    ? DEDUCTION_LIMITS_2024.workExpensesFlat
    : d.workExpensesActual
  if (workExp > 0) breakdown['Work expenses (Berufskosten)'] = workExp

  // Transport — take higher of OV or car, capped per ZH rules
  const carDeduction = Math.min(
    d.transportKm * DEDUCTION_LIMITS_2024.transportKmRate,
    DEDUCTION_LIMITS_2024.transportMax_zh
  )
  const transport = Math.max(d.transportOv, carDeduction)
  if (transport > 0) breakdown['Transport'] = transport

  // Health insurance — partial deduction (simplified: 50% of premiums)
  const health = Math.round(d.healthInsurance * 0.5 * 100) / 100
  if (health > 0) breakdown['Health insurance (50%)'] = health

  // Donations (min CHF 100 to qualify)
  const donations = d.donations >= DEDUCTION_LIMITS_2024.donationsMin ? d.donations : 0
  if (donations > 0) breakdown['Donations (Spenden)'] = donations

  // Childcare
  const childcare = Math.min(d.childcare, DEDUCTION_LIMITS_2024.childcareMax)
  if (childcare > 0) breakdown['Childcare (Drittbetreuung)'] = childcare

  // Other
  if (d.otherDeductions > 0) breakdown['Other deductions'] = d.otherDeductions

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0)
  return { total: Math.round(total * 100) / 100, breakdown }
}

/**
 * Estimate Swiss personal income tax — Zurich 2024
 */
export function estimatePersonalTax(
  income:   PersonalIncome,
  deductions: PersonalDeductions,
  selfEmployed = false
): PersonalTaxResult {
  const totalIncome = Math.round(
    (income.salaryGross + income.sideIncome + income.investmentIncome + income.otherIncome) * 100
  ) / 100

  const { total: totalDeductions, breakdown: deductionBreakdown } = computeDeductions(deductions, selfEmployed)

  const taxableIncome = Math.max(0, Math.round((totalIncome - totalDeductions) * 100) / 100)

  // Federal
  const federalTax = computeProgressiveTax(taxableIncome, FEDERAL_BRACKETS_SINGLE)

  // Cantonal unit tax
  const cantonalUnit = computeProgressiveTax(taxableIncome, ZH_CANTONAL_BRACKETS)

  // Cantonal tax (unit × cantonal Steuerfuss)
  const cantonalTax  = Math.round(cantonalUnit * ZH_CANTONAL_STEUERFUSS * 100) / 100

  // Municipal tax (unit × city Steuerfuss)
  const municipalTax = Math.round(cantonalUnit * ZH_CITY_STEUERFUSS * 100) / 100

  const totalTax    = Math.round((federalTax + cantonalTax + municipalTax) * 100) / 100
  const effectiveRate = taxableIncome > 0
    ? Math.round((totalTax / totalIncome) * 10000) / 100
    : 0

  const marginalFed  = getMarginalRate(taxableIncome, FEDERAL_BRACKETS_SINGLE)
  const marginalCant = getMarginalRate(taxableIncome, ZH_CANTONAL_BRACKETS)
  const marginalRate = Math.round(
    (marginalFed + marginalCant * (ZH_CANTONAL_STEUERFUSS + ZH_CITY_STEUERFUSS)) * 100
  ) / 100

  return {
    totalIncome,
    totalDeductions,
    taxableIncome,
    federalTax,
    cantonalTax,
    municipalTax,
    totalTax,
    effectiveRate,
    marginalRate,
    disclaimer: PERSONAL_DISCLAIMER,
    deductionBreakdown,
  }
}

const PERSONAL_DISCLAIMER = 'This is a simplified estimate using 2024 Zurich rates. Actual tax depends on your specific situation, married/single status, children, and other factors. Use the official Zurich tax calculator at zh.ch or consult a Steuerberater.'

/** Personal annual submission checklist items */
export const PERSONAL_CHECKLIST = [
  { id: 'lohnausweis',      label: 'Lohnausweis (salary certificate) received from employer' },
  { id: 'saeule3a',         label: '3. Säule A certificate received (Einzahlungsbestätigung)' },
  { id: 'saeule2',          label: 'BVG / 2. Säule statement received (Vorsorgeausweis)' },
  { id: 'bank_statements',  label: 'Bank account statements and interest certificates' },
  { id: 'wertschriften',    label: 'Securities (Wertschriften) and dividends declared' },
  { id: 'fahrzeug',         label: 'Vehicle / assets (Fahrzeug / Vermögen) declared' },
  { id: 'insurance',        label: 'Health + life insurance premiums noted for deduction' },
  { id: 'receipts',         label: 'Donation receipts collected (if deducting Spenden)' },
  { id: 'tax_return_filed', label: 'Tax return filed via ZHprivateTax or eTax.zh.ch' },
  { id: 'extension',        label: 'Extension requested if deadline 31 March cannot be met' },
] as const

export type PersonalChecklistId = typeof PERSONAL_CHECKLIST[number]['id']

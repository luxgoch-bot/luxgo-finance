/**
 * Swiss GmbH / AG Corporate Tax Estimator
 * Canton: Zurich (ZH) — Tax year 2024
 *
 * ⚠️ ESTIMATION ONLY — always consult a licensed Treuhänder for official filings.
 *
 * Tax structure for a Zurich GmbH:
 * 1. Federal tax: 8.5% on net profit (effective ~7.83% after self-deduction)
 * 2. Cantonal tax (Kanton Zürich): 7% on taxable profit
 * 3. Municipal tax (Gemeinde): cantonal tax × Steuerfuss
 *    Zurich City Steuerfuss 2024: 119%
 * 4. Optional: Church tax (Kirchensteuer) — excluded here
 *
 * Zurich effective combined rate (before federal): ~18–20% depending on municipality
 */

export interface CorporateTaxBreakdown {
  taxableProfit:        number
  federalTax:           number          // 8.5% on profit (simplified)
  cantonalTax:          number          // 7% on profit
  municipalTax:         number          // cantonal × steuerfuss
  totalTax:             number
  effectiveRate:        number          // percentage
  profitAfterTax:       number
  disclaimer: string
}

export interface ProfitAndLoss {
  totalRevenue:           number
  totalDeductibleExpenses: number
  ebitda:                 number
  estimatedAhvDeduction:  number        // Estimated AHV on owner salary
  estimatedTaxableProfit: number
  expensesByCategory:     Record<string, number>
}

// Zurich municipality Steuerfuss 2024 (1.19 = 119%)
// Source: Stadt Zürich Finanzdepartement
export const ZURICH_CITY_STEUERFUSS = 1.19

// Cantonal corporate rate (simplified linear rate before municipal multiplier)
export const ZH_CANTONAL_RATE = 0.07   // 7%

// Federal rate (article 68 DBSG — 8.5% on net profit, simplified as effective)
export const FEDERAL_RATE = 0.085      // 8.5%

/**
 * Estimate Swiss GmbH corporate tax for Zurich
 * @param taxableProfit  Net taxable profit in CHF (after deductions)
 * @param steuerfuss     Municipal multiplier (default: Zurich City 1.19)
 */
export function estimateCorporateTax(
  taxableProfit: number,
  steuerfuss: number = ZURICH_CITY_STEUERFUSS
): CorporateTaxBreakdown {
  if (taxableProfit <= 0) {
    return {
      taxableProfit:       0,
      federalTax:          0,
      cantonalTax:         0,
      municipalTax:        0,
      totalTax:            0,
      effectiveRate:       0,
      profitAfterTax:      0,
      disclaimer: DISCLAIMER,
    }
  }

  // Federal: 8.5% — slightly simplified (actual uses self-deduction method)
  const federalTax   = Math.round(taxableProfit * FEDERAL_RATE * 100) / 100

  // Cantonal: 7% on taxable profit
  const cantonalTax  = Math.round(taxableProfit * ZH_CANTONAL_RATE * 100) / 100

  // Municipal: cantonal × steuerfuss
  const municipalTax = Math.round(cantonalTax * steuerfuss * 100) / 100

  const totalTax     = Math.round((federalTax + cantonalTax + municipalTax) * 100) / 100
  const effectiveRate = taxableProfit > 0
    ? Math.round((totalTax / taxableProfit) * 10000) / 100
    : 0
  const profitAfterTax = Math.max(0, Math.round((taxableProfit - totalTax) * 100) / 100)

  return {
    taxableProfit,
    federalTax,
    cantonalTax,
    municipalTax,
    totalTax,
    effectiveRate,
    profitAfterTax,
    disclaimer: DISCLAIMER,
  }
}

/**
 * Build P&L from income + expense records
 */
export function buildProfitAndLoss(
  incomeRecords:  Array<{ amount_chf: number; net_amount?: number }>,
  expenseRecords: Array<{ amount_chf: number; net_amount?: number; category?: string; is_deductible: boolean }>,
  ownerSalary = 0   // Salary expense (already in expenses as 'salary' category)
): ProfitAndLoss {
  const totalRevenue = incomeRecords.reduce((s, i) => s + (i.net_amount ?? i.amount_chf), 0)

  const deductible = expenseRecords.filter(e => e.is_deductible)
  const totalDeductibleExpenses = deductible.reduce((s, e) => s + (e.net_amount ?? e.amount_chf), 0)

  const ebitda = totalRevenue - totalDeductibleExpenses

  // AHV: typically ~10% on owner salary drawn from the GmbH
  const estimatedAhvDeduction = ownerSalary > 0 ? Math.round(ownerSalary * 0.1 * 100) / 100 : 0

  const estimatedTaxableProfit = Math.max(0, ebitda - estimatedAhvDeduction)

  // Group by category
  const expensesByCategory: Record<string, number> = {}
  for (const e of deductible) {
    const cat = e.category ?? 'other'
    expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + (e.net_amount ?? e.amount_chf)
  }

  return {
    totalRevenue:           Math.round(totalRevenue * 100) / 100,
    totalDeductibleExpenses: Math.round(totalDeductibleExpenses * 100) / 100,
    ebitda:                 Math.round(ebitda * 100) / 100,
    estimatedAhvDeduction:  estimatedAhvDeduction,
    estimatedTaxableProfit: Math.round(estimatedTaxableProfit * 100) / 100,
    expensesByCategory,
  }
}

const DISCLAIMER = 'This is a simplified tax estimation for reference only. Swiss GmbH tax depends on precise accounting, depreciation schedules, and approved deductions. Consult a licensed Treuhänder (fiduciary) for your official Steuererklaerung.'

/** GmbH annual submission checklist items */
export const GMBH_CHECKLIST = [
  { id: 'annual_accounts',  label: 'Annual financial statements prepared (Jahresrechnung)',         category: 'accounting' },
  { id: 'mwst_q1',          label: 'MWST Q1 submitted to ESTV',                                     category: 'mwst' },
  { id: 'mwst_q2',          label: 'MWST Q2 submitted to ESTV',                                     category: 'mwst' },
  { id: 'mwst_q3',          label: 'MWST Q3 submitted to ESTV',                                     category: 'mwst' },
  { id: 'mwst_q4',          label: 'MWST Q4 submitted to ESTV',                                     category: 'mwst' },
  { id: 'ahv_contributions', label: 'AHV/ALV/IV contributions paid to Ausgleichskasse',             category: 'social' },
  { id: 'lohnausweis',      label: 'Salary declarations (Lohnausweis) issued to employees',         category: 'payroll' },
  { id: 'pension_fund',     label: 'BVG / Pension fund contributions confirmed (2. Säule)',          category: 'social' },
  { id: 'tax_return',       label: 'Corporate tax return filed (Steuererklaerung GmbH)',             category: 'tax' },
  { id: 'general_meeting',  label: 'Annual general meeting held (Generalversammlung)',               category: 'corporate' },
  { id: 'profit_allocation', label: 'Profit allocation / dividend decision documented',             category: 'corporate' },
] as const

export type ChecklistItemId = typeof GMBH_CHECKLIST[number]['id']

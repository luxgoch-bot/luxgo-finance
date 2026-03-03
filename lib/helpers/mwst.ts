/**
 * MWST (Swiss VAT) Quarterly Reporting Utilities
 *
 * Reporting method: vereinbarte Entgelte (accrual / agreed consideration)
 * - VAT is reported when invoiced, not when paid
 * - Quarterly periods: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
 * - Filing deadlines: 60 days after quarter end (est. 28 Feb, 31 May, 31 Aug, 30 Nov)
 * - Filing portal: https://estv.admin.ch
 */

import type { Income, Expense } from '@/types'
import { extractVAT, getNetAmount } from './vat'

// ── Quarter date ranges ─────────────────────────────────────────────────

export function getQuarterDateRange(
  year: number,
  quarter: 1 | 2 | 3 | 4
): { start: string; end: string; label: string } {
  const startMonth = (quarter - 1) * 3       // 0, 3, 6, 9
  const endMonth   = startMonth + 2           // 2, 5, 8, 11
  const lastDay    = new Date(year, endMonth + 1, 0).getDate()

  const pad = (n: number) => String(n + 1).padStart(2, '0')

  return {
    start: `${year}-${pad(startMonth)}-01`,
    end:   `${year}-${pad(endMonth)}-${lastDay}`,
    label: `Q${quarter} ${year}`,
  }
}

export function getQuarterForDate(dateStr: string): 1 | 2 | 3 | 4 {
  const month = new Date(dateStr + 'T00:00:00').getMonth() + 1 // 1-12
  return Math.ceil(month / 3) as 1 | 2 | 3 | 4
}

export function getCurrentQuarter(): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const now = new Date()
  return {
    year:    now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4,
  }
}

/** MWST filing deadline: 60 days after quarter end */
export function getMwstDeadline(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const endMonths: Record<number, number> = { 1: 2, 2: 5, 3: 8, 4: 11 }
  const endMonth = endMonths[quarter]
  const lastDay  = new Date(year, endMonth + 1, 0).getDate()
  const quarterEnd = new Date(year, endMonth, lastDay)
  quarterEnd.setDate(quarterEnd.getDate() + 60)
  return quarterEnd
}

export function getDaysUntilDeadline(year: number, quarter: 1 | 2 | 3 | 4): number {
  const deadline = getMwstDeadline(year, quarter)
  const today    = new Date()
  const diff     = deadline.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── VAT rate grouping ────────────────────────────────────────────────────

export interface VatRateGroup {
  rate:       number
  label:      string
  grossTotal: number
  vatTotal:   number
  netTotal:   number
  count:      number
}

export interface MwstQuarterSummary {
  year:        number
  quarter:     1 | 2 | 3 | 4
  profileId:   string
  dateRange:   { start: string; end: string; label: string }

  // Section A — Output VAT (collected on income)
  incomeByRate:     VatRateGroup[]
  totalGrossIncome: number
  totalVatCollected: number
  totalNetIncome:   number

  // Section B — Input Tax (paid on deductible expenses)
  expenseByRate:     VatRateGroup[]
  totalGrossExpenses: number
  totalInputTax:      number
  totalNetExpenses:   number

  // Section C — Net VAT payable
  vatPayable:  number
  vatRefundable: number  // if input > collected

  // Line items (for expandable detail)
  incomeLines:   Income[]
  expenseLines:  Expense[]
}

const VAT_RATE_LABELS: Record<number, string> = {
  8.1: 'Standard 8.1%',
  2.6: 'Reduced 2.6%',
  3.8: 'Special 3.8%',
  0:   'Zero-rated 0%',
}

function groupByVatRate(
  items: Array<{ amount_chf: number; vat_rate: number; vat_amount?: number; net_amount?: number; is_deductible?: boolean }>,
  onlyDeductible = false
): VatRateGroup[] {
  const map = new Map<number, VatRateGroup>()

  for (const item of items) {
    if (onlyDeductible && item.is_deductible === false) continue

    const rate    = item.vat_rate
    const gross   = item.amount_chf
    const vat     = item.vat_amount  ?? extractVAT(gross, rate)
    const net     = item.net_amount  ?? getNetAmount(gross, rate)

    if (!map.has(rate)) {
      map.set(rate, {
        rate,
        label:      VAT_RATE_LABELS[rate] ?? `${rate}%`,
        grossTotal: 0,
        vatTotal:   0,
        netTotal:   0,
        count:      0,
      })
    }

    const g = map.get(rate)!
    g.grossTotal += gross
    g.vatTotal   += vat
    g.netTotal   += net
    g.count++
  }

  return Array.from(map.values()).sort((a, b) => b.rate - a.rate)
}

/**
 * Aggregate quarterly VAT summary from raw income + expense arrays.
 * Call this after fetching the relevant records from Supabase.
 */
export function aggregateQuarterlyVAT(
  profileId: string,
  year:      number,
  quarter:   1 | 2 | 3 | 4,
  allIncome:   Income[],
  allExpenses: Expense[]
): MwstQuarterSummary {
  const dateRange = getQuarterDateRange(year, quarter)

  // Filter to this profile + this quarter
  const incomeLines = allIncome.filter(
    i => i.profile_id === profileId &&
         i.date >= dateRange.start &&
         i.date <= dateRange.end
  )

  // Only deductible expenses count as input tax
  const expenseLines = allExpenses.filter(
    e => e.profile_id === profileId &&
         e.date >= dateRange.start &&
         e.date <= dateRange.end
  )

  const incomeByRate  = groupByVatRate(incomeLines)
  const expenseByRate = groupByVatRate(expenseLines, true)

  const totalGrossIncome   = incomeByRate.reduce((s, g) => s + g.grossTotal, 0)
  const totalVatCollected  = incomeByRate.reduce((s, g) => s + g.vatTotal, 0)
  const totalNetIncome     = incomeByRate.reduce((s, g) => s + g.netTotal, 0)

  const totalGrossExpenses = expenseByRate.reduce((s, g) => s + g.grossTotal, 0)
  const totalInputTax      = expenseByRate.reduce((s, g) => s + g.vatTotal, 0)
  const totalNetExpenses   = expenseByRate.reduce((s, g) => s + g.netTotal, 0)

  const diff = totalVatCollected - totalInputTax
  const vatPayable   = diff > 0 ? Math.round(diff * 100) / 100 : 0
  const vatRefundable = diff < 0 ? Math.round(-diff * 100) / 100 : 0

  return {
    year,
    quarter,
    profileId,
    dateRange,
    incomeByRate,
    totalGrossIncome:   Math.round(totalGrossIncome * 100) / 100,
    totalVatCollected:  Math.round(totalVatCollected * 100) / 100,
    totalNetIncome:     Math.round(totalNetIncome * 100) / 100,
    expenseByRate,
    totalGrossExpenses: Math.round(totalGrossExpenses * 100) / 100,
    totalInputTax:      Math.round(totalInputTax * 100) / 100,
    totalNetExpenses:   Math.round(totalNetExpenses * 100) / 100,
    vatPayable,
    vatRefundable,
    incomeLines,
    expenseLines,
  }
}

/** Returns all 4 quarters for a year with their summaries */
export function aggregateYearlyVAT(
  profileId:   string,
  year:        number,
  allIncome:   Income[],
  allExpenses: Expense[]
): MwstQuarterSummary[] {
  return ([1, 2, 3, 4] as const).map(q =>
    aggregateQuarterlyVAT(profileId, year, q, allIncome, allExpenses)
  )
}

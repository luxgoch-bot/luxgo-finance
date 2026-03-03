'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { aggregateQuarterlyVAT } from '@/lib/helpers/mwst'
import type { Income, Expense } from '@/types'

/** Get or create a MWST report record for a given profile/year/quarter */
export async function getOrCreateMwstReport(
  profileId: string,
  year: number,
  quarter: 1 | 2 | 3 | 4
) {
  const supabase = await createClient()

  // Try to find existing
  const { data: existing } = await supabase
    .from('mwst_reports')
    .select('*')
    .eq('profile_id', profileId)
    .eq('quarter', quarter)
    .single()

  if (existing) {
    // Check if the record is from this year (join via tax_year)
    const { data: taxYear } = await supabase
      .from('tax_years')
      .select('*')
      .eq('id', existing.tax_year_id)
      .single()

    if (taxYear?.year === year) return { data: existing }
  }

  // Get or create tax year
  let { data: taxYear } = await supabase
    .from('tax_years')
    .select('*')
    .eq('profile_id', profileId)
    .eq('year', year)
    .single()

  if (!taxYear) {
    const { data: newYear, error } = await supabase
      .from('tax_years')
      .insert({ profile_id: profileId, year, status: 'open' })
      .select()
      .single()
    if (error) return { error: error.message }
    taxYear = newYear
  }

  // Get aggregated VAT data
  const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
    supabase.from('income').select('*').eq('profile_id', profileId),
    supabase.from('expenses').select('*').eq('profile_id', profileId),
  ])

  const summary = aggregateQuarterlyVAT(
    profileId, year, quarter,
    (incomeData as Income[]) ?? [],
    (expenseData as Expense[]) ?? []
  )

  const { data: report, error } = await supabase
    .from('mwst_reports')
    .insert({
      profile_id:             profileId,
      tax_year_id:            taxYear!.id,
      quarter,
      total_revenue_chf:      summary.totalGrossIncome,
      vat_collected:          summary.totalVatCollected,
      vat_paid_on_expenses:   summary.totalInputTax,
      vat_payable:            summary.vatPayable,
      status:                 'draft',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: report }
}

/** Recalculate and update an existing MWST report from current income/expense data */
export async function recalculateMwstReport(reportId: string) {
  const supabase = await createClient()

  const { data: report, error: rErr } = await supabase
    .from('mwst_reports')
    .select('*, tax_years(year, profile_id)')
    .eq('id', reportId)
    .single()

  if (rErr || !report) return { error: rErr?.message ?? 'Report not found' }

  const profileId = report.profile_id
  const year      = (report.tax_years as { year: number })?.year
  const quarter   = report.quarter as 1 | 2 | 3 | 4

  const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
    supabase.from('income').select('*').eq('profile_id', profileId),
    supabase.from('expenses').select('*').eq('profile_id', profileId),
  ])

  const summary = aggregateQuarterlyVAT(
    profileId, year, quarter,
    (incomeData as Income[]) ?? [],
    (expenseData as Expense[]) ?? []
  )

  const { error } = await supabase.from('mwst_reports').update({
    total_revenue_chf:    summary.totalGrossIncome,
    vat_collected:        summary.totalVatCollected,
    vat_paid_on_expenses: summary.totalInputTax,
    vat_payable:          summary.vatPayable,
  }).eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/mwst')
  return { success: true, summary }
}

/** Update the notes field on a MWST report */
export async function updateMwstNotes(reportId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mwst_reports')
    .update({ notes })
    .eq('id', reportId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/mwst')
  return { success: true }
}

/** Mark a MWST report as submitted */
export async function markMwstSubmitted(reportId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mwst_reports')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', reportId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/mwst')
  return { success: true }
}

/** Mark a submitted report back to draft (allows re-editing) */
export async function revertMwstToDraft(reportId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mwst_reports')
    .update({ status: 'draft', submitted_at: null })
    .eq('id', reportId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/mwst')
  return { success: true }
}

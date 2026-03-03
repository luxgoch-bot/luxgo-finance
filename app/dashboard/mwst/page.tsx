import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { MwstOverviewClient } from './mwst-client'
import { aggregateYearlyVAT, getCurrentQuarter, getDaysUntilDeadline } from '@/lib/helpers/mwst'
import type { Profile, MwstReport, Income, Expense, TaxYear } from '@/types'

export default async function MwstPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('type')

  if (!profiles?.length) redirect('/setup')

  const profileIds = profiles.map((p: Profile) => p.id)
  const currentYear = new Date().getFullYear()

  const [
    { data: incomeData },
    { data: expenseData },
    { data: mwstReports },
    { data: taxYears },
  ] = await Promise.all([
    supabase.from('income').select('*').in('profile_id', profileIds),
    supabase.from('expenses').select('*').in('profile_id', profileIds),
    supabase.from('mwst_reports')
      .select('*, tax_years(year)')
      .in('profile_id', profileIds)
      .order('quarter'),
    supabase.from('tax_years').select('*').in('profile_id', profileIds).order('year', { ascending: false }),
  ])

  // Compute yearly summaries for the business profile (or first profile)
  const businessProfile = profiles.find((p: Profile) => p.type === 'business') ?? profiles[0]
  const yearlySummaries = aggregateYearlyVAT(
    businessProfile.id,
    currentYear,
    (incomeData as Income[]) ?? [],
    (expenseData as Expense[]) ?? []
  )

  const { quarter: currentQuarter } = getCurrentQuarter()
  const daysUntilDeadline = getDaysUntilDeadline(currentYear, currentQuarter)

  return (
    <MwstOverviewClient
      profiles={profiles as Profile[]}
      mwstReports={(mwstReports as (MwstReport & { tax_years: { year: number } })[]) ?? []}
      taxYears={(taxYears as TaxYear[]) ?? []}
      yearlySummaries={yearlySummaries}
      currentYear={currentYear}
      currentQuarter={currentQuarter}
      daysUntilDeadline={daysUntilDeadline}
      allIncome={(incomeData as Income[]) ?? []}
      allExpenses={(expenseData as Expense[]) ?? []}
    />
  )
}

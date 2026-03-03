import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { QuarterReportClient } from './quarter-client'
import { aggregateQuarterlyVAT } from '@/lib/helpers/mwst'
import type { Profile, MwstReport, Income, Expense } from '@/types'

interface Props {
  params: Promise<{ reportId: string }>
}

export default async function QuarterReportPage({ params }: Props) {
  const { reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load the report with its tax year
  const { data: report, error } = await supabase
    .from('mwst_reports')
    .select('*, tax_years(year, profile_id)')
    .eq('id', reportId)
    .single()

  if (error || !report) notFound()

  // Verify ownership
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
  const profileIds = (profiles ?? []).map((p: Profile) => p.id)
  if (!profileIds.includes(report.profile_id)) notFound()

  const profile  = profiles?.find((p: Profile) => p.id === report.profile_id)
  const year     = (report.tax_years as { year: number })?.year
  const quarter  = report.quarter as 1 | 2 | 3 | 4

  // Fetch all income + expenses for this profile
  const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
    supabase.from('income').select('*').eq('profile_id', report.profile_id),
    supabase.from('expenses').select('*').eq('profile_id', report.profile_id),
  ])

  const summary = aggregateQuarterlyVAT(
    report.profile_id,
    year,
    quarter,
    (incomeData as Income[]) ?? [],
    (expenseData as Expense[]) ?? []
  )

  return (
    <QuarterReportClient
      report={report as MwstReport}
      profile={profile as Profile}
      summary={summary}
      year={year}
    />
  )
}

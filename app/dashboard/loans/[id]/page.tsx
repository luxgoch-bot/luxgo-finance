import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { LoanDetailClient } from './loan-detail-client'
import type { Profile, Loan, LoanRepayment } from '@/types'

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)

  if (!profiles?.length) redirect('/setup')

  const profileIds = profiles.map((p: Profile) => p.id)

  const [{ data: loan }, { data: repayments }] = await Promise.all([
    supabase.from('loans').select('*').eq('id', params.id).in('profile_id', profileIds).single(),
    supabase.from('loan_repayments').select('*').eq('loan_id', params.id).order('date', { ascending: true }),
  ])

  if (!loan) notFound()

  return (
    <LoanDetailClient
      profiles={profiles as Profile[]}
      loan={loan as Loan}
      initialRepayments={(repayments ?? []) as LoanRepayment[]}
    />
  )
}

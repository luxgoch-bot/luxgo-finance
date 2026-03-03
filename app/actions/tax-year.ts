'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function getOrCreateTaxYear(profileId: string, year: number) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('tax_years')
    .select('*')
    .eq('profile_id', profileId)
    .eq('year', year)
    .single()

  if (existing) return { data: existing }

  const { data, error } = await supabase
    .from('tax_years')
    .insert({ profile_id: profileId, year, status: 'open' })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateTaxYearNotes(taxYearId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tax_years')
    .update({ notes })
    .eq('id', taxYearId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tax-year')
  return { success: true }
}

export async function updateTaxYearStatus(
  taxYearId: string,
  status: 'open' | 'submitted' | 'closed'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tax_years')
    .update({ status })
    .eq('id', taxYearId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tax-year')
  return { success: true }
}

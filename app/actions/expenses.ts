'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { extractVAT, getNetAmount } from '@/lib/helpers/vat'
import type { CreateExpenseInput } from '@/types'

export async function addExpense(data: CreateExpenseInput) {
  const supabase = await createClient()

  const vat_amount = extractVAT(data.amount_chf, data.vat_rate)
  const net_amount = getNetAmount(data.amount_chf, data.vat_rate)

  const { error } = await supabase.from('expenses').insert({
    ...data,
    vat_amount: Math.round(vat_amount * 100) / 100,
    net_amount: Math.round(net_amount * 100) / 100,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateExpense(id: string, data: Partial<CreateExpenseInput>) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { ...data }
  if (data.amount_chf !== undefined && data.vat_rate !== undefined) {
    updates.vat_amount = Math.round(extractVAT(data.amount_chf, data.vat_rate) * 100) / 100
    updates.net_amount = Math.round(getNetAmount(data.amount_chf, data.vat_rate) * 100) / 100
  }

  const { error } = await supabase.from('expenses').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function bulkInsertExpenses(expenses: CreateExpenseInput[]) {
  const supabase = await createClient()
  const rows = expenses.map(e => ({
    ...e,
    vat_amount: Math.round(extractVAT(e.amount_chf, e.vat_rate) * 100) / 100,
    net_amount: Math.round(getNetAmount(e.amount_chf, e.vat_rate) * 100) / 100,
  }))
  const { error } = await supabase.from('expenses').insert(rows)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
  return { success: true, count: rows.length }
}

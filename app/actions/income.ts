'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { calculateVAT, getNetAmount } from '@/lib/helpers/vat'
import type { CreateIncomeInput } from '@/types'

export async function addIncome(data: CreateIncomeInput) {
  const supabase = await createClient()

  const vat_amount = calculateVAT(data.net_amount ?? getNetAmount(data.amount_chf, data.vat_rate), data.vat_rate)
  const net_amount = getNetAmount(data.amount_chf, data.vat_rate)

  const { error } = await supabase.from('income').insert({
    ...data,
    vat_amount: Math.round(vat_amount * 100) / 100,
    net_amount: Math.round(net_amount * 100) / 100,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/income')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateIncome(id: string, data: Partial<CreateIncomeInput>) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { ...data }
  if (data.amount_chf !== undefined && data.vat_rate !== undefined) {
    updates.vat_amount = Math.round(calculateVAT(getNetAmount(data.amount_chf, data.vat_rate), data.vat_rate) * 100) / 100
    updates.net_amount = Math.round(getNetAmount(data.amount_chf, data.vat_rate) * 100) / 100
  }

  const { error } = await supabase.from('income').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/income')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('income').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/income')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadReceipt(formData: FormData, folder: 'income' | 'expenses') {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
  return { url: data.publicUrl }
}

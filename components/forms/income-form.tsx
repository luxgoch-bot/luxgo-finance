'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { incomeSchema, type IncomeFormValues } from '@/lib/schemas'
import { addIncome, updateIncome, uploadReceipt } from '@/app/actions/income'
import { extractVAT, getNetAmount } from '@/lib/helpers/vat'
import { formatChfCompact } from '@/lib/helpers/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Loader2 } from 'lucide-react'
import type { Income, Profile, TaxYear } from '@/types'

interface IncomeFormProps {
  profiles: Profile[]
  taxYears: TaxYear[]
  defaultProfileId: string
  editRecord?: Income
  onSuccess: () => void
}

const inputCls = 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20 h-9 text-sm'
const errCls   = 'text-xs text-red-500 mt-1'

export function IncomeForm({ profiles, taxYears, defaultProfileId, editRecord, onSuccess }: IncomeFormProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema) as any,
    defaultValues: editRecord
      ? {
          profile_id:     editRecord.profile_id,
          tax_year_id:    editRecord.tax_year_id ?? undefined,
          date:           editRecord.date,
          client:         editRecord.client ?? '',
          description:    editRecord.description ?? '',
          category:       (editRecord.category as IncomeFormValues['category']) ?? 'transport',
          amount_chf:     editRecord.amount_chf,
          vat_rate:       editRecord.vat_rate,
          invoice_number: editRecord.invoice_number ?? '',
          receipt_url:    editRecord.receipt_url ?? '',
        }
      : {
          profile_id: defaultProfileId,
          date:       new Date().toISOString().split('T')[0],
          category:   'transport' as const,
          amount_chf: 0,
          vat_rate:   8.1,
        },
  })

  const amountChf = watch('amount_chf') ?? 0
  const vatRate   = watch('vat_rate')   ?? 8.1
  const vatAmount = extractVAT(Number(amountChf), Number(vatRate))
  const netAmount = getNetAmount(Number(amountChf), Number(vatRate))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadReceipt(fd, 'income')
    if (result.url) setValue('receipt_url', result.url)
    setUploading(false)
  }

  async function onSubmit(data: IncomeFormValues) {
    setSaving(true)
    setServerError(null)

    const payload = {
      profile_id:     data.profile_id,
      tax_year_id:    data.tax_year_id ?? undefined,
      date:           data.date,
      client:         data.client || undefined,
      description:    data.description || undefined,
      category:       data.category,
      amount_chf:     data.amount_chf,
      vat_rate:       data.vat_rate,
      vat_amount:     Math.round(vatAmount * 100) / 100,
      net_amount:     Math.round(netAmount * 100) / 100,
      invoice_number: data.invoice_number || undefined,
      receipt_url:    data.receipt_url || undefined,
    }

    const result = editRecord
      ? await updateIncome(editRecord.id, payload)
      : await addIncome(payload)

    if (result?.error) {
      setServerError(result.error)
      setSaving(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Date *</Label>
          <Input type="date" {...register('date')} className={inputCls} />
          {errors.date && <p className={errCls}>{errors.date.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Profile *</Label>
          <Select
            defaultValue={editRecord?.profile_id ?? defaultProfileId}
            onValueChange={v => setValue('profile_id', v)}
          >
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Client</Label>
        <Input {...register('client')} placeholder="Client name" className={inputCls} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Description</Label>
        <Textarea
          {...register('description')}
          placeholder="Service description…"
          rows={2}
          className="bg-white border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Category *</Label>
          <Select
            defaultValue={editRecord?.category ?? 'transport'}
            onValueChange={v => setValue('category', v as IncomeFormValues['category'])}
          >
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transport">🚗 Transport</SelectItem>
              <SelectItem value="charter">✈️ Charter</SelectItem>
              <SelectItem value="other">📦 Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Invoice #</Label>
          <Input {...register('invoice_number')} placeholder="INV-2024-001" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Gross Amount (CHF) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('amount_chf', { valueAsNumber: true })}
            placeholder="0.00"
            className={inputCls}
          />
          {errors.amount_chf && <p className={errCls}>{errors.amount_chf.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">VAT Rate *</Label>
          <Select
            defaultValue={String(editRecord?.vat_rate ?? 8.1)}
            onValueChange={v => setValue('vat_rate', Number(v))}
          >
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="8.1">8.1% — Standard</SelectItem>
              <SelectItem value="2.6">2.6% — Reduced</SelectItem>
              <SelectItem value="3.8">3.8% — Special</SelectItem>
              <SelectItem value="0">0% — Zero-rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live VAT Preview */}
      {amountChf > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">VAT Amount</p>
            <p className="text-sm font-semibold text-amber-700">CHF {formatChfCompact(vatAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Amount</p>
            <p className="text-sm font-semibold text-gray-700">CHF {formatChfCompact(netAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gross</p>
            <p className="text-sm font-semibold text-gray-700">CHF {formatChfCompact(amountChf)}</p>
          </div>
        </div>
      )}

      {/* Receipt Upload */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Receipt</Label>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Attach receipt'}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          </label>
          {watch('receipt_url') && (
            <a href={watch('receipt_url') as string} target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-600 hover:underline truncate max-w-[160px]">
              View uploaded ↗
            </a>
          )}
        </div>
        <input type="hidden" {...register('receipt_url')} />
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{serverError}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving || uploading}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {editRecord ? 'Save changes' : 'Add income'}
        </Button>
      </div>
    </form>
  )
}

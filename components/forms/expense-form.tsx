'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseSchema, type ExpenseFormValues } from '@/lib/schemas'
import { addExpense, updateExpense } from '@/app/actions/expenses'
import { uploadReceipt } from '@/app/actions/income'
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
import type { Expense, Profile, TaxYear } from '@/types'

const EXPENSE_CATEGORIES = [
  { value: 'vehicle',     label: '🚗 Vehicle' },
  { value: 'fuel',        label: '⛽ Fuel' },
  { value: 'insurance',   label: '🛡️ Insurance' },
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'office',      label: '🖥️ Office' },
  { value: 'marketing',   label: '📣 Marketing' },
  { value: 'salary',      label: '👥 Salary / AHV' },
  { value: 'tax',         label: '🏛️ Tax Payments' },
  { value: 'other',       label: '📦 Other' },
]

const inputCls = 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 h-9 text-sm'
const errCls   = 'text-xs text-red-500 mt-1'

interface ExpenseFormProps {
  profiles: Profile[]
  taxYears: TaxYear[]
  defaultProfileId: string
  editRecord?: Expense
  onSuccess: () => void
}

export function ExpenseForm({ profiles, taxYears, defaultProfileId, editRecord, onSuccess }: ExpenseFormProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: editRecord
      ? {
          profile_id:    editRecord.profile_id,
          tax_year_id:   editRecord.tax_year_id ?? undefined,
          date:          editRecord.date,
          vendor:        editRecord.vendor ?? '',
          description:   editRecord.description ?? '',
          category:      (editRecord.category as ExpenseFormValues['category']) ?? 'other',
          amount_chf:    editRecord.amount_chf,
          vat_rate:      editRecord.vat_rate,
          is_deductible: editRecord.is_deductible,
          receipt_url:   editRecord.receipt_url ?? '',
        }
      : {
          profile_id:    defaultProfileId,
          date:          new Date().toISOString().split('T')[0],
          category:      'other' as const,
          amount_chf:    0,
          vat_rate:      8.1,
          is_deductible: true,
        },
  })

  const amountChf    = watch('amount_chf')    ?? 0
  const vatRate      = watch('vat_rate')      ?? 8.1
  const category     = watch('category')
  const isDeductible = watch('is_deductible')
  const receiptUrl   = watch('receipt_url')
  const vatAmount    = extractVAT(Number(amountChf), Number(vatRate))
  const netAmount    = getNetAmount(Number(amountChf), Number(vatRate))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadReceipt(fd, 'expenses')
    if (result.url) setValue('receipt_url', result.url)
    setUploading(false)
  }

  async function onSubmit(data: ExpenseFormValues) {
    setSaving(true)
    setServerError(null)

    const { km, ...rest } = data
    const kmNote = km ? ` (${km} km)` : ''

    const payload = {
      profile_id:    rest.profile_id,
      tax_year_id:   rest.tax_year_id ?? undefined,
      date:          rest.date,
      vendor:        rest.vendor || undefined,
      description:   rest.description ? `${rest.description}${kmNote}` : (kmNote || undefined),
      category:      rest.category,
      amount_chf:    rest.amount_chf,
      vat_rate:      rest.vat_rate,
      vat_amount:    Math.round(vatAmount * 100) / 100,
      net_amount:    Math.round(netAmount * 100) / 100,
      is_deductible: rest.is_deductible,
      receipt_url:   rest.receipt_url || undefined,
    }

    const result = editRecord
      ? await updateExpense(editRecord.id, payload)
      : await addExpense(payload)

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
        <Label className="text-xs font-medium text-gray-600">Vendor / Supplier</Label>
        <Input {...register('vendor')} placeholder="Vendor name" className={inputCls} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Description</Label>
        <Textarea
          {...register('description')}
          placeholder="Expense description…"
          rows={2}
          className="bg-white border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Category *</Label>
          <Select
            defaultValue={editRecord?.category ?? 'other'}
            onValueChange={v => setValue('category', v as ExpenseFormValues['category'])}
          >
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(category === 'vehicle' || category === 'fuel') ? (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Kilometres (km)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              {...register('km', { valueAsNumber: true })}
              placeholder="e.g. 150"
              className={inputCls}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Tax Year</Label>
            <Select
              defaultValue={editRecord?.tax_year_id ?? undefined}
              onValueChange={v => setValue('tax_year_id', v)}
            >
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {taxYears.map(y => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Amount (CHF) *</Label>
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
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">VAT (input tax)</p>
            <p className="text-sm font-semibold text-blue-700">CHF {formatChfCompact(vatAmount)}</p>
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

      {/* Deductible toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
        <input
          type="checkbox"
          id="is_deductible"
          {...register('is_deductible')}
          className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="is_deductible" className="text-sm text-gray-700 cursor-pointer select-none">
          <span className="font-medium">Tax deductible</span>
          <span className="text-gray-400 text-xs ml-1">— include in tax calculation</span>
        </label>
        {!isDeductible && (
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Non-deductible</span>
        )}
      </div>

      {/* Receipt Upload */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Receipt</Label>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Attach receipt'}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          </label>
          {receiptUrl && (
            <a href={receiptUrl as string} target="_blank" rel="noopener noreferrer"
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
          {editRecord ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  )
}

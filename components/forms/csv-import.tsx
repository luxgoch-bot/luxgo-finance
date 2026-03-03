'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkInsertExpenses } from '@/app/actions/expenses'
import { csvExpenseRowSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react'
import type { ExpenseCategory } from '@/types'

interface CsvRow {
  date: string
  vendor?: string
  description?: string
  amount: string | number
  category?: string
  vat_rate?: string | number
}

interface ParsedRow extends CsvRow {
  _valid: boolean
  _error?: string
  _mapped_category: ExpenseCategory
}

interface CsvImportProps {
  profileId: string
  taxYearId?: string
  onSuccess: () => void
}

const VALID_CATEGORIES: ExpenseCategory[] = [
  'vehicle','fuel','insurance','maintenance','office','marketing','salary','tax','other',
]

function mapCategory(raw: string | undefined): ExpenseCategory {
  if (!raw) return 'other'
  const lower = raw.toLowerCase().trim()
  if (VALID_CATEGORIES.includes(lower as ExpenseCategory)) return lower as ExpenseCategory
  const map: Record<string, ExpenseCategory> = {
    car: 'vehicle', benzin: 'fuel', petrol: 'fuel', gas: 'fuel',
    versicherung: 'insurance', unterhalt: 'maintenance', service: 'maintenance',
    büro: 'office', office: 'office', werbung: 'marketing', lohn: 'salary',
    ahv: 'salary', steuer: 'tax', steuern: 'tax',
  }
  return map[lower] ?? 'other'
}

export function CsvImport({ profileId, taxYearId, onSuccess }: CsvImportProps) {
  const [rows, setRows]     = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success?: number; error?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: ParsedRow[] = data.map((row) => {
          const safeRow = {
            date:        String(row.date ?? ''),
            vendor:      String(row.vendor ?? ''),
            description: String(row.description ?? ''),
            amount:      row.amount,
            category:    String(row.category ?? 'other'),
            vat_rate:    row.vat_rate ?? 8.1,
          }
          const parse = csvExpenseRowSchema.safeParse(safeRow)
          return {
            ...safeRow,
            _valid: parse.success,
            _error: !parse.success ? parse.error.issues[0]?.message : undefined,
            _mapped_category: mapCategory(safeRow.category),
          }
        })
        setRows(parsed)
      },
    })
  }

  async function handleImport() {
    const valid = rows.filter(r => r._valid)
    if (!valid.length) return
    setImporting(true)
    setResult(null)

    const expenses = valid.map(r => ({
      profile_id:    profileId,
      tax_year_id:   taxYearId ?? null,
      date:          String(r.date),
      vendor:        r.vendor || null,
      description:   r.description || null,
      amount_chf:    Number(r.amount),
      vat_rate:      Number(r.vat_rate ?? 8.1),
      category:      r._mapped_category,
      is_deductible: true,
      receipt_url:   undefined,
    }))

    const res = await bulkInsertExpenses(expenses as Parameters<typeof bulkInsertExpenses>[0])
    setImporting(false)
    if (res.error) {
      setResult({ error: res.error })
    } else {
      setResult({ success: res.count })
      setRows([])
      if (fileRef.current) fileRef.current.value = ''
      onSuccess()
    }
  }

  const validCount   = rows.filter(r => r._valid).length
  const invalidCount = rows.filter(r => !r._valid).length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-amber-400 transition-colors">
        <Upload className="h-8 w-8 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">Upload CSV file</p>
          <p className="text-xs text-gray-400 mt-1">
            Columns: <code className="bg-gray-100 px-1 rounded">date, vendor, description, amount, category, vat_rate</code>
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>

      {/* Sample format */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> CSV format example:
        </p>
        <pre className="text-xs text-gray-500 font-mono leading-relaxed overflow-auto">
{`date,vendor,description,amount,category,vat_rate
2024-03-15,Shell,Fuel Zurich,85.50,fuel,8.1
2024-03-16,Garage AG,Oil change,320.00,maintenance,8.1
2024-03-17,Zurich Insurance,Q1 premium,1200.00,insurance,0`}
        </pre>
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{rows.length} rows detected</span>
            {validCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} valid
              </Badge>
            )}
            {invalidCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                {invalidCount} invalid
              </Badge>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Vendor</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row._valid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2 text-gray-700">{String(row.date)}</td>
                    <td className="px-3 py-2 text-gray-600">{row.vendor || '—'}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">CHF {Number(row.amount).toFixed(2)}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row._mapped_category}</td>
                    <td className="px-3 py-2">
                      {row._valid
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <span className="text-red-500" title={row._error}><XCircle className="h-3.5 w-3.5" /></span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            onClick={handleImport}
            disabled={importing || validCount === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            {importing
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing…</>
              : `Import ${validCount} expense${validCount !== 1 ? 's' : ''}`
            }
          </Button>
        </div>
      )}

      {result?.success !== undefined && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Successfully imported {result.success} expenses
        </div>
      )}
      {result?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {result.error}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { deleteExpense } from '@/app/actions/expenses'
import { ExpenseForm } from '@/components/forms/expense-form'
import { CsvImport } from '@/components/forms/csv-import'
import { SummaryBar } from '@/components/summary-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Plus, Search, Pencil, Trash2, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, Upload } from 'lucide-react'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { extractVAT, getNetAmount } from '@/lib/helpers/vat'
import type { Expense, Profile, TaxYear } from '@/types'

type SortKey = 'date' | 'amount_chf' | 'vendor' | 'category'
type SortDir = 'asc' | 'desc'

const CATEGORY_LABELS: Record<string, string> = {
  vehicle:     '🚗 Vehicle',
  fuel:        '⛽ Fuel',
  insurance:   '🛡️ Insurance',
  maintenance: '🔧 Maintenance',
  office:      '🖥️ Office',
  marketing:   '📣 Marketing',
  salary:      '👥 Salary/AHV',
  tax:         '🏛️ Tax',
  other:       '📦 Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  vehicle:     'bg-blue-50 text-blue-700 border-blue-200',
  fuel:        'bg-red-50 text-red-700 border-red-200',
  insurance:   'bg-purple-50 text-purple-700 border-purple-200',
  maintenance: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  office:      'bg-cyan-50 text-cyan-700 border-cyan-200',
  marketing:   'bg-pink-50 text-pink-700 border-pink-200',
  salary:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  tax:         'bg-orange-50 text-orange-700 border-orange-200',
  other:       'bg-gray-100 text-gray-600 border-gray-200',
}

interface ExpensesClientProps {
  profiles: Profile[]
  expenseRecords: Expense[]
  taxYears: TaxYear[]
}

export function ExpensesClient({ profiles, expenseRecords: initial, taxYears }: ExpensesClientProps) {
  const [records, setRecords] = useState<Expense[]>(initial)
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [sheetTab, setSheetTab]           = useState<'form' | 'csv'>('form')
  const [editRecord, setEditRecord]       = useState<Expense | undefined>()
  const [deleteTarget, setDeleteTarget]   = useState<Expense | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const [search, setSearch]               = useState('')
  const [filterProfile, setFilterProfile] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterYear, setFilterYear]       = useState<string>('all')
  const [filterDeductible, setFilterDeductible] = useState<string>('all')
  const [sortKey, setSortKey]             = useState<SortKey>('date')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')

  const defaultProfileId = profiles[0]?.id ?? ''

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let r = records
    if (filterProfile !== 'all') r = r.filter(e => e.profile_id === filterProfile)
    if (filterCategory !== 'all') r = r.filter(e => e.category === filterCategory)
    if (filterYear !== 'all') r = r.filter(e => e.date.startsWith(filterYear))
    if (filterDeductible === 'yes') r = r.filter(e => e.is_deductible)
    if (filterDeductible === 'no') r = r.filter(e => !e.is_deductible)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(e =>
        e.vendor?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      )
    }
    return [...r].sort((a, b) => {
      const av: string | number = a[sortKey] ?? ''
      const bv: string | number = b[sortKey] ?? ''
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    })
  }, [records, filterProfile, filterCategory, filterYear, filterDeductible, search, sortKey, sortDir])

  const totals = useMemo(() => ({
    gross: filtered.reduce((s, e) => s + e.amount_chf, 0),
    vat:   filtered.reduce((s, e) => s + (e.vat_amount ?? extractVAT(e.amount_chf, e.vat_rate)), 0),
    net:   filtered.reduce((s, e) => s + (e.net_amount ?? getNetAmount(e.amount_chf, e.vat_rate)), 0),
  }), [filtered])

  const years = useMemo(() => {
    const set = new Set(records.map(e => e.date.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [records])

  function openAdd() {
    setEditRecord(undefined)
    setSheetTab('form')
    setSheetOpen(true)
  }

  function openCsvImport() {
    setEditRecord(undefined)
    setSheetTab('csv')
    setSheetOpen(true)
  }

  function openEdit(record: Expense) {
    setEditRecord(record)
    setSheetTab('form')
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    setEditRecord(undefined)
    window.location.reload()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    const result = await deleteExpense(deleteTarget.id)
    if (result?.error) {
      setRecords(prev => [...prev, deleteTarget].sort((a, b) => b.date.localeCompare(a.date)))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300 ml-1" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-amber-500 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 text-amber-500 ml-1" />
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Expenses</h1>
          <p className="text-xs text-gray-400">{records.length} total records</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openCsvImport} className="gap-1.5 text-gray-600">
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={openAdd} className="bg-amber-500 hover:bg-amber-400 text-black font-medium gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Expense
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-4">
        {/* Summary bar */}
        <SummaryBar
          totalGross={totals.gross}
          totalVat={totals.vat}
          totalNet={totals.net}
          count={filtered.length}
          label="Filtered"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vendor, description…"
              className="pl-8 h-9 text-sm border-gray-200"
            />
          </div>

          <Select value={filterProfile} onValueChange={setFilterProfile}>
            <SelectTrigger className="h-9 w-44 text-sm border-gray-200">
              <SelectValue placeholder="Profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All profiles</SelectItem>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-40 text-sm border-gray-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-9 w-28 text-sm border-gray-200">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterDeductible} onValueChange={setFilterDeductible}>
            <SelectTrigger className="h-9 w-36 text-sm border-gray-200">
              <SelectValue placeholder="Deductible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">✅ Deductible</SelectItem>
              <SelectItem value="no">❌ Non-deductible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('date')} className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700">
                      Date <SortIcon k="date" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('vendor')} className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700">
                      Vendor <SortIcon k="vendor" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('category')} className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700">
                      Category <SortIcon k="category" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort('amount_chf')} className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 ml-auto">
                      Amount <SortIcon k="amount_chf" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">VAT</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Ded.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Receipt</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">
                      No expenses found.{' '}
                      <button onClick={openAdd} className="text-amber-600 hover:underline">Add the first one →</button>
                    </td>
                  </tr>
                ) : filtered.map(exp => {
                  const vat = exp.vat_amount ?? extractVAT(exp.amount_chf, exp.vat_rate)
                  return (
                    <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateCh(exp.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[130px] truncate">{exp.vendor || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{exp.description || '—'}</td>
                      <td className="px-4 py-3">
                        {exp.category ? (
                          <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[exp.category] ?? ''}`}>
                            {CATEGORY_LABELS[exp.category] ?? exp.category}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatChf(exp.amount_chf)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700 tabular-nums whitespace-nowrap text-xs">
                        {formatChf(vat)} <span className="text-gray-400">({exp.vat_rate}%)</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exp.is_deductible
                          ? <span className="text-emerald-500" title="Tax deductible">✅</span>
                          : <span className="text-gray-300" title="Not deductible">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exp.receipt_url
                          ? <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center text-amber-600 hover:text-amber-700">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(exp)}
                            className="p-1 rounded hover:bg-amber-100 text-gray-400 hover:text-amber-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(exp)}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Totals ({filtered.length} records)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatChf(totals.gross)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums whitespace-nowrap">
                      {formatChf(totals.vat)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit/CSV Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {sheetTab === 'csv' ? 'Import from CSV' : editRecord ? 'Edit Expense' : 'Add Expense'}
            </SheetTitle>
          </SheetHeader>

          {sheetTab === 'csv' ? (
            <CsvImport
              profileId={defaultProfileId}
              taxYearId={taxYears[0]?.id}
              onSuccess={handleSuccess}
            />
          ) : (
            <ExpenseForm
              profiles={profiles}
              taxYears={taxYears}
              defaultProfileId={defaultProfileId}
              editRecord={editRecord}
              onSuccess={handleSuccess}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogDescription>
              Permanently delete{' '}
              <strong>{deleteTarget?.vendor ?? 'this expense'}</strong>
              {deleteTarget?.amount_chf ? ` — ${formatChf(deleteTarget.amount_chf)}` : ''}.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

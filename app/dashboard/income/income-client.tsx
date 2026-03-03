'use client'

import { useState, useMemo, useCallback } from 'react'
import { deleteIncome } from '@/app/actions/income'
import { IncomeForm } from '@/components/forms/income-form'
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
import { Plus, Search, Pencil, Trash2, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { extractVAT, getNetAmount } from '@/lib/helpers/vat'
import type { Income, Profile, TaxYear } from '@/types'

type SortKey = 'date' | 'amount_chf' | 'client' | 'category'
type SortDir = 'asc' | 'desc'

const CATEGORY_LABELS: Record<string, string> = {
  transport: '🚗 Transport',
  charter:   '✈️ Charter',
  other:     '📦 Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-50 text-blue-700 border-blue-200',
  charter:   'bg-purple-50 text-purple-700 border-purple-200',
  other:     'bg-gray-100 text-gray-600 border-gray-200',
}

interface IncomeClientProps {
  profiles: Profile[]
  incomeRecords: Income[]
  taxYears: TaxYear[]
}

export function IncomeClient({ profiles, incomeRecords: initial, taxYears }: IncomeClientProps) {
  // Optimistic local state
  const [records, setRecords] = useState<Income[]>(initial)

  // UI state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Income | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [search, setSearch]           = useState('')
  const [filterProfile, setFilterProfile] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterYear, setFilterYear]   = useState<string>('all')
  const [sortKey, setSortKey]         = useState<SortKey>('date')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')

  const currentYear = new Date().getFullYear()
  const defaultProfileId = profiles[0]?.id ?? ''

  // Sort handler
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // Filtered + sorted records
  const filtered = useMemo(() => {
    let r = records

    if (filterProfile !== 'all') r = r.filter(i => i.profile_id === filterProfile)
    if (filterCategory !== 'all') r = r.filter(i => i.category === filterCategory)
    if (filterYear !== 'all') r = r.filter(i => i.date.startsWith(filterYear))
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(i =>
        i.client?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q)
      )
    }

    return [...r].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    })
  }, [records, filterProfile, filterCategory, filterYear, search, sortKey, sortDir])

  // Summary totals
  const totals = useMemo(() => ({
    gross: filtered.reduce((s, i) => s + i.amount_chf, 0),
    vat:   filtered.reduce((s, i) => s + (i.vat_amount ?? extractVAT(i.amount_chf, i.vat_rate)), 0),
    net:   filtered.reduce((s, i) => s + (i.net_amount ?? getNetAmount(i.amount_chf, i.vat_rate)), 0),
  }), [filtered])

  // Year options
  const years = useMemo(() => {
    const set = new Set(records.map(i => i.date.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [records])

  function openAdd() {
    setEditRecord(undefined)
    setSheetOpen(true)
  }

  function openEdit(record: Income) {
    setEditRecord(record)
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    setEditRecord(undefined)
    // Trigger re-fetch by reloading (optimistic would go here in production)
    window.location.reload()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    // Optimistic remove
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    const result = await deleteIncome(deleteTarget.id)
    if (result?.error) {
      // Revert on failure
      setRecords(prev => [...prev, deleteTarget].sort((a,b) => b.date.localeCompare(a.date)))
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
          <h1 className="text-base font-semibold text-gray-900">Income</h1>
          <p className="text-xs text-gray-400">{records.length} total records</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-amber-500 hover:bg-amber-400 text-black font-medium gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Income
        </Button>
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
              placeholder="Search client, description, invoice…"
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
            <SelectTrigger className="h-9 w-36 text-sm border-gray-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="charter">Charter</SelectItem>
              <SelectItem value="other">Other</SelectItem>
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
                    <button onClick={() => handleSort('client')} className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700">
                      Client <SortIcon k="client" />
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
                      Gross <SortIcon k="amount_chf" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">VAT %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">VAT CHF</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Net CHF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-gray-400">
                      No income records found.{' '}
                      <button onClick={openAdd} className="text-amber-600 hover:underline">Add the first one →</button>
                    </td>
                  </tr>
                ) : filtered.map(inc => {
                  const vat = inc.vat_amount ?? extractVAT(inc.amount_chf, inc.vat_rate)
                  const net = inc.net_amount ?? getNetAmount(inc.amount_chf, inc.vat_rate)
                  return (
                    <tr key={inc.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateCh(inc.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{inc.client || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{inc.description || '—'}</td>
                      <td className="px-4 py-3">
                        {inc.category ? (
                          <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[inc.category] ?? ''}`}>
                            {CATEGORY_LABELS[inc.category] ?? inc.category}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatChf(inc.amount_chf)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{inc.vat_rate}%</td>
                      <td className="px-4 py-3 text-right text-amber-700 tabular-nums whitespace-nowrap">{formatChf(vat)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums whitespace-nowrap">{formatChf(net)}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{inc.invoice_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {inc.receipt_url && (
                            <a href={inc.receipt_url} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => openEdit(inc)}
                            className="p-1 rounded hover:bg-amber-100 text-gray-400 hover:text-amber-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(inc)}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Footer totals row */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Totals ({filtered.length} records)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatChf(totals.gross)}
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums whitespace-nowrap">
                      {formatChf(totals.vat)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700 tabular-nums whitespace-nowrap">
                      {formatChf(totals.net)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editRecord ? 'Edit Income' : 'Add Income'}</SheetTitle>
          </SheetHeader>
          <IncomeForm
            profiles={profiles}
            taxYears={taxYears}
            defaultProfileId={defaultProfileId}
            editRecord={editRecord}
            onSuccess={handleSuccess}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete income record?</DialogTitle>
            <DialogDescription>
              This will permanently delete{' '}
              <strong>{deleteTarget?.client ?? 'this record'}</strong>
              {deleteTarget?.amount_chf ? ` — ${formatChf(deleteTarget.amount_chf)}` : ''}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

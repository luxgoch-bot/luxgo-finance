'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { Plus, ChevronLeft, AlertTriangle } from 'lucide-react'
import type {
  Profile, TaxYear, InvestmentAccount, InvestmentTransaction,
  InvestmentHolding, InvestmentTransactionType, InvestmentAssetType,
} from '@/types'

interface AccountDetailClientProps {
  profiles: Profile[]
  account: InvestmentAccount
  transactions: InvestmentTransaction[]
  holdings: InvestmentHolding[]
  taxYears: TaxYear[]
}

const ACCOUNT_TYPE_BADGE: Record<string, string> = {
  stocks: 'bg-blue-900/40 text-blue-400 border-blue-800',
  crypto: 'bg-purple-900/40 text-purple-400 border-purple-800',
  etf:    'bg-green-900/40 text-green-400 border-green-800',
  bonds:  'bg-amber-900/40 text-amber-400 border-amber-800',
  mixed:  'bg-gray-800 text-gray-400 border-gray-700',
}

const ASSET_TYPE_BADGE: Record<string, string> = {
  stock:  'bg-blue-900/40 text-blue-400 border-blue-800',
  etf:    'bg-green-900/40 text-green-400 border-green-800',
  crypto: 'bg-purple-900/40 text-purple-400 border-purple-800',
  bond:   'bg-amber-900/40 text-amber-400 border-amber-800',
  other:  'bg-gray-800 text-gray-400 border-gray-700',
}

const TX_TYPE_BADGE: Record<string, string> = {
  buy:      'bg-blue-900/40 text-blue-400 border-blue-800',
  sell:     'bg-green-900/40 text-green-400 border-green-800',
  dividend: 'bg-orange-900/40 text-orange-400 border-orange-800',
  interest: 'bg-amber-900/40 text-amber-400 border-amber-800',
  fee:      'bg-gray-800 text-gray-400 border-gray-700',
}

const defaultTxForm = () => ({
  type: 'buy' as InvestmentTransactionType,
  asset_name: '',
  asset_ticker: '',
  asset_type: 'stock' as InvestmentAssetType,
  quantity: '',
  price_per_unit: '',
  total_amount_chf: '',
  fees_chf: '0',
  exchange_rate: '1',
  date: new Date().toISOString().split('T')[0],
  notes: '',
})

export function AccountDetailClient({
  profiles: _profiles,
  account,
  transactions: initialTx,
  holdings: initialHoldings,
  taxYears: _taxYears,
}: AccountDetailClientProps) {
  const supabase = createClient()

  const [transactions, setTransactions] = useState<InvestmentTransaction[]>(initialTx)
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(initialHoldings)
  const [showAddTx, setShowAddTx] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterAsset, setFilterAsset] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [txForm, setTxForm] = useState(defaultTxForm())

  function updateTxField(field: string, value: string) {
    setTxForm(prev => {
      const updated = { ...prev, [field]: value }
      if (['quantity', 'price_per_unit', 'exchange_rate'].includes(field)) {
        const qty = parseFloat(updated.quantity) || 0
        const price = parseFloat(updated.price_per_unit) || 0
        const rate = parseFloat(updated.exchange_rate) || 1
        if (qty > 0 && price > 0) {
          updated.total_amount_chf = (qty * price * rate).toFixed(2)
        }
      }
      return updated
    })
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filterAsset && !tx.asset_name.toLowerCase().includes(filterAsset.toLowerCase())) return false
      if (filterType && filterType !== 'all' && tx.type !== filterType) return false
      if (filterFrom && tx.date < filterFrom) return false
      if (filterTo && tx.date > filterTo) return false
      return true
    })
  }, [transactions, filterAsset, filterType, filterFrom, filterTo])

  const totalInvested = useMemo(
    () => transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.total_amount_chf, 0),
    [transactions]
  )

  const currentValue = useMemo(
    () => holdings.reduce((s, h) => s + (h.current_value_chf ?? 0), 0),
    [holdings]
  )

  const dividendsReceived = useMemo(
    () => transactions
      .filter(t => t.type === 'dividend' || t.type === 'interest')
      .reduce((s, t) => s + t.total_amount_chf, 0),
    [transactions]
  )

  const unrealisedGain = currentValue - totalInvested

  const realisedByAsset = useMemo(() => {
    const map: Record<string, { totalBought: number; totalSold: number }> = {}
    transactions.forEach(tx => {
      if (!map[tx.asset_name]) map[tx.asset_name] = { totalBought: 0, totalSold: 0 }
      if (tx.type === 'buy') map[tx.asset_name].totalBought += tx.total_amount_chf
      if (tx.type === 'sell') map[tx.asset_name].totalSold += tx.total_amount_chf
    })
    return Object.entries(map)
      .filter(([, v]) => v.totalSold > 0)
      .map(([assetName, v]) => ({
        assetName,
        totalBought: v.totalBought,
        totalSold: v.totalSold,
        pnl: v.totalSold - v.totalBought,
      }))
  }, [transactions])

  async function handleAddTransaction() {
    if (!txForm.asset_name || !txForm.total_amount_chf) {
      toast.error('Asset name and total amount are required')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        account_id: account.id,
        profile_id: account.profile_id,
        date: txForm.date,
        type: txForm.type,
        asset_name: txForm.asset_name,
        asset_ticker: txForm.asset_ticker || null,
        asset_type: txForm.asset_type,
        total_amount_chf: parseFloat(txForm.total_amount_chf),
        fees_chf: parseFloat(txForm.fees_chf) || 0,
        exchange_rate: parseFloat(txForm.exchange_rate) || 1,
        notes: txForm.notes || null,
      }
      if (txForm.quantity) payload.quantity = parseFloat(txForm.quantity)
      if (txForm.price_per_unit) payload.price_per_unit = parseFloat(txForm.price_per_unit)

      const { data: newTx, error } = await supabase
        .from('investment_transactions')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      setTransactions(prev => [newTx as InvestmentTransaction, ...prev])

      // Update holdings for buy
      if (txForm.type === 'buy' && txForm.quantity && txForm.price_per_unit) {
        const qty = parseFloat(txForm.quantity)
        const price = parseFloat(txForm.price_per_unit)
        const existing = holdings.find(h => h.asset_name === txForm.asset_name)

        if (existing) {
          const newQty = (existing.quantity ?? 0) + qty
          const newAvg = ((existing.quantity ?? 0) * (existing.average_buy_price ?? 0) + qty * price) / newQty
          const { data: updated } = await supabase
            .from('investment_holdings')
            .update({ quantity: newQty, average_buy_price: newAvg, last_updated: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single()
          if (updated) setHoldings(prev => prev.map(h => h.id === existing.id ? updated as InvestmentHolding : h))
        } else {
          const { data: newHolding } = await supabase
            .from('investment_holdings')
            .insert({
              account_id: account.id,
              profile_id: account.profile_id,
              asset_name: txForm.asset_name,
              asset_ticker: txForm.asset_ticker || null,
              asset_type: txForm.asset_type,
              quantity: qty,
              average_buy_price: price,
              current_value_chf: qty * price,
            })
            .select()
            .single()
          if (newHolding) setHoldings(prev => [...prev, newHolding as InvestmentHolding])
        }
      }

      // Reduce holdings for sell
      if (txForm.type === 'sell' && txForm.quantity) {
        const qty = parseFloat(txForm.quantity)
        const existing = holdings.find(h => h.asset_name === txForm.asset_name)
        if (existing) {
          const newQty = Math.max(0, (existing.quantity ?? 0) - qty)
          const { data: updated } = await supabase
            .from('investment_holdings')
            .update({ quantity: newQty, last_updated: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single()
          if (updated) setHoldings(prev => prev.map(h => h.id === existing.id ? updated as InvestmentHolding : h))
        }
      }

      toast.success('Transaction added')
      setShowAddTx(false)
      setTxForm(defaultTxForm())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add transaction')
    } finally {
      setSaving(false)
    }
  }

  const showQtyPrice = txForm.type === 'buy' || txForm.type === 'sell'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/investments">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{account.name}</h1>
            <Badge className={ACCOUNT_TYPE_BADGE[account.account_type] ?? 'bg-gray-800 text-gray-400'}>
              {account.account_type}
            </Badge>
          </div>
          {account.broker && <p className="text-sm text-gray-400 mt-0.5">{account.broker}</p>}
        </div>
        <Button
          onClick={() => setShowAddTx(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Invested</p>
            <p className="text-xl font-bold text-white">{formatChf(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Current Value</p>
            <p className="text-xl font-bold text-amber-400">{formatChf(currentValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Unrealised P&L</p>
            <p className={`text-xl font-bold ${unrealisedGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {unrealisedGain >= 0 ? '+' : ''}{formatChf(unrealisedGain)}
            </p>
            <p className="text-xs text-green-500 mt-0.5">TAX FREE 🇨🇭</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Dividends Received</p>
            <p className="text-xl font-bold text-orange-400">{formatChf(dividendsReceived)}</p>
            <p className="text-xs text-orange-400/70 mt-0.5">Taxable ⚠️</p>
          </CardContent>
        </Card>
      </div>

      {/* Swiss Tax Note */}
      <div className="rounded-lg border border-amber-800/30 bg-amber-950/10 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200/70">
          Capital gains on this account are{' '}
          <strong className="text-green-400">TAX-FREE</strong> for private investors in Switzerland.
          Dividends and interest are{' '}
          <strong className="text-orange-400">taxable income</strong> and must be declared.
        </p>
      </div>

      {/* Holdings Table */}
      {holdings.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Current Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Asset</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Avg Buy (CHF)</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                  <th className="px-4 py-3 text-right">Gain / Loss</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const cost = (h.quantity ?? 0) * (h.average_buy_price ?? 0)
                  const gl = (h.current_value_chf ?? 0) - cost
                  const glPct = cost > 0 ? (gl / cost) * 100 : 0
                  return (
                    <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{h.asset_name}</p>
                        {h.asset_ticker && <p className="text-xs text-gray-500">{h.asset_ticker}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ASSET_TYPE_BADGE[h.asset_type ?? 'other'] ?? 'bg-gray-800 text-gray-400'}>
                          {h.asset_type ?? 'other'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {h.quantity != null ? h.quantity.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {h.average_buy_price != null ? formatChf(h.average_buy_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {h.current_value_chf != null ? formatChf(h.current_value_chf) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={gl >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          {gl >= 0 ? '+' : ''}{formatChf(gl)}
                        </p>
                        <p className={`text-xs ${gl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {glPct >= 0 ? '+' : ''}{glPct.toFixed(2)}%
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-white">Transaction History</h2>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search asset..."
              value={filterAsset}
              onChange={e => setFilterAsset(e.target.value)}
              className="w-48 h-8 bg-gray-800 border-gray-700 text-sm"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8 bg-gray-800 border-gray-700 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
                <SelectItem value="interest">Interest</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="w-40 h-8 bg-gray-800 border-gray-700 text-sm"
            />
            <Input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="w-40 h-8 bg-gray-800 border-gray-700 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Price/Unit</th>
                <th className="px-4 py-3 text-right">Total (CHF)</th>
                <th className="px-4 py-3 text-right">Fees</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDateCh(tx.date)}</td>
                  <td className="px-4 py-3">
                    <Badge className={TX_TYPE_BADGE[tx.type] ?? 'bg-gray-800 text-gray-400'}>{tx.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{tx.asset_name}</p>
                    {tx.asset_ticker && <p className="text-xs text-gray-500">{tx.asset_ticker}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {tx.quantity != null ? Number(tx.quantity).toFixed(4) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {tx.price_per_unit != null ? formatChf(Number(tx.price_per_unit)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">{formatChf(tx.total_amount_chf)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {tx.fees_chf > 0 ? formatChf(tx.fees_chf) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{tx.notes ?? '—'}</td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No transactions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realised P&L */}
      {realisedByAsset.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Realised P&L by Asset</h2>
            <Badge className="bg-green-900/30 text-green-400 border-green-800 text-xs">TAX FREE 🇨🇭</Badge>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-right">Total Bought (CHF)</th>
                <th className="px-4 py-3 text-right">Total Sold (CHF)</th>
                <th className="px-4 py-3 text-right">Realised P&L</th>
              </tr>
            </thead>
            <tbody>
              {realisedByAsset.map(row => (
                <tr key={row.assetName} className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-white font-medium">{row.assetName}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatChf(row.totalBought)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatChf(row.totalSold)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={row.pnl >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                      {row.pnl >= 0 ? '+' : ''}{formatChf(row.pnl)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Dialog open={showAddTx} onOpenChange={open => { setShowAddTx(open); if (!open) setTxForm(defaultTxForm()) }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription className="text-gray-400">
              Record a buy, sell, dividend, interest, or fee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={txForm.type} onValueChange={v => updateTxField('type', v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="dividend">Dividend</SelectItem>
                    <SelectItem value="interest">Interest</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={txForm.date}
                  onChange={e => updateTxField('date', e.target.value)}
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Asset Name *</Label>
                <Input
                  value={txForm.asset_name}
                  onChange={e => updateTxField('asset_name', e.target.value)}
                  placeholder="e.g. Apple Inc."
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label>Ticker</Label>
                <Input
                  value={txForm.asset_ticker}
                  onChange={e => updateTxField('asset_ticker', e.target.value)}
                  placeholder="e.g. AAPL"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Asset Type</Label>
              <Select value={txForm.asset_type} onValueChange={v => updateTxField('asset_type', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showQtyPrice && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="any"
                    value={txForm.quantity}
                    onChange={e => updateTxField('quantity', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <Label>Price per Unit (CHF)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={txForm.price_per_unit}
                    onChange={e => updateTxField('price_per_unit', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Amount (CHF) *</Label>
                <Input
                  type="number"
                  step="any"
                  value={txForm.total_amount_chf}
                  onChange={e => updateTxField('total_amount_chf', e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label>Fees (CHF)</Label>
                <Input
                  type="number"
                  step="any"
                  value={txForm.fees_chf}
                  onChange={e => updateTxField('fees_chf', e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
            </div>

            {account.currency !== 'CHF' && (
              <div>
                <Label>Exchange Rate (1 {account.currency} = ? CHF)</Label>
                <Input
                  type="number"
                  step="any"
                  value={txForm.exchange_rate}
                  onChange={e => updateTxField('exchange_rate', e.target.value)}
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Input
                value={txForm.notes}
                onChange={e => updateTxField('notes', e.target.value)}
                placeholder="Optional notes"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>

            {(txForm.type === 'dividend' || txForm.type === 'interest') && (
              <div className="rounded-lg border border-orange-800/40 bg-orange-950/20 p-3 text-xs text-orange-300">
                ⚠️ Dividends and interest are <strong>taxable income</strong> in Switzerland.
                This will be reflected in your tax summary.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddTx(false); setTxForm(defaultTxForm()) }}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {saving ? 'Saving…' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

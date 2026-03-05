'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Plus, Edit3, Download } from 'lucide-react'
import type { Profile, InvestmentAccount, InvestmentTransaction, InvestmentHolding, TaxYear } from '@/types'

interface InvestmentsClientProps {
  profiles: Profile[]
  accounts: InvestmentAccount[]
  transactions: InvestmentTransaction[]
  holdings: InvestmentHolding[]
  taxYears: TaxYear[]
}

export function InvestmentsClient({ 
  profiles, 
  accounts, 
  transactions, 
  holdings, 
  taxYears 
}: InvestmentsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id || '')
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false)
  const [isEditHoldingModalOpen, setIsEditHoldingModalOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts'>('overview')
  
  // Form states
  const [newAccount, setNewAccount] = useState({
    name: '',
    broker: '',
    account_type: 'stocks' as 'stocks' | 'crypto' | 'etf' | 'bonds' | 'mixed',
    currency: 'CHF',
    notes: ''
  })
  
  const [editHoldingForm, setEditHoldingForm] = useState({
    current_value_chf: 0
  })

  // Calculate summary metrics
  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + (holding.current_value_chf || 0), 0)
  
  const totalUnrealisedGainLoss = holdings.reduce((sum, holding) => {
    if (holding.quantity && holding.average_buy_price) {
      const costBasis = holding.quantity * holding.average_buy_price
      const currentValue = holding.current_value_chf || 0
      return sum + (currentValue - costBasis)
    }
    return sum
  }, 0)

  const dividendsYTD = transactions
    .filter(t => t.type === 'dividend' || t.type === 'interest')
    .reduce((sum, t) => sum + t.total_amount_chf, 0)

  const accountCount = accounts.length

  // Handle adding a new account
  const handleAddAccount = async () => {
    if (!selectedProfileId) return
    
    try {
      const { error } = await supabase
        .from('investment_accounts')
        .insert({
          profile_id: selectedProfileId,
          name: newAccount.name,
          broker: newAccount.broker,
          account_type: newAccount.account_type,
          currency: newAccount.currency,
          notes: newAccount.notes
        })
      
      if (error) throw error
      
      setIsAddAccountModalOpen(false)
      setNewAccount({
        name: '',
        broker: '',
        account_type: 'stocks',
        currency: 'CHF',
        notes: ''
      })
      
      // Refresh data
      router.refresh()
    } catch (error) {
      console.error('Error adding account:', error)
    }
  }

  // Handle updating holding value
  const handleUpdateHolding = async () => {
    if (!editingHolding) return
    
    try {
      const { error } = await supabase
        .from('investment_holdings')
        .update({
          current_value_chf: editHoldingForm.current_value_chf
        })
        .eq('id', editingHolding.id)
      
      if (error) throw error
      
      setIsEditHoldingModalOpen(false)
      setEditingHolding(null)
      
      // Refresh data
      router.refresh()
    } catch (error) {
      console.error('Error updating holding:', error)
    }
  }

  // Export holdings to CSV
  const exportHoldingsCSV = (holdings: InvestmentHolding[]) => {
    const rows = [
      ['Asset', 'Ticker', 'Type', 'Quantity', 'Avg Buy Price (CHF)', 'Current Value (CHF)'],
      ...holdings.map(h => [
        h.asset_name,
        h.asset_ticker ?? '',
        h.asset_type ?? '',
        h.quantity?.toString() ?? '',
        h.average_buy_price?.toString() ?? '',
        h.current_value_chf?.toString() ?? '',
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investments-${new Date().getFullYear()}.csv`
    a.click()
  }

  // Get account holdings count
  const getAccountHoldingsCount = (accountId: string) => {
    return holdings.filter(h => h.account_id === accountId).length
  }

  // Get account total value
  const getAccountTotalValue = (accountId: string) => {
    return holdings
      .filter(h => h.account_id === accountId)
      .reduce((sum, h) => sum + (h.current_value_chf || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Investments</h1>
        <Button 
          onClick={() => setIsAddAccountModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Swiss Tax Panel */}
      <Card className="border-amber-500 bg-gray-800">
        <CardHeader className="border-b border-amber-500">
          <CardTitle className="text-amber-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            🇨🇭 Swiss Tax Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <p className="text-gray-300 text-sm">
            Capital gains on movable assets are TAX-FREE for private investors in Switzerland. However, all holdings must be declared annually for Vermögenssteuer (wealth tax). Dividends and interest income are TAXABLE and must be added to your income declaration. Note: Professional/high-frequency traders may be subject to income tax on gains — consult a tax advisor.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm">Taxable Income YTD</p>
              <p className="text-amber-400 font-bold text-xl">CHF {dividendsYTD.toFixed(2)}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm">Total Portfolio Value</p>
              <p className="text-emerald-400 font-bold text-xl">CHF {totalPortfolioValue.toFixed(2)}</p>
            </div>
          </div>
          
          <Button 
            onClick={() => exportHoldingsCSV(holdings)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Holdings CSV
          </Button>
        </CardContent>
      </Card>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Portfolio Value</p>
            <p className="text-emerald-400 font-bold text-xl">CHF {totalPortfolioValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Unrealised Gain/Loss</p>
            <p className={`font-bold text-xl ${totalUnrealisedGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              CHF {totalUnrealisedGainLoss.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Dividends YTD</p>
            <p className="text-amber-400 font-bold text-xl">CHF {dividendsYTD.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Number of Accounts</p>
            <p className="text-emerald-400 font-bold text-xl">{accountCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Investment Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Card 
              key={account.id} 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 cursor-pointer"
              onClick={() => router.push(`/dashboard/investments/${account.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">{account.name}</h3>
                    {account.broker && (
                      <p className="text-gray-400 text-sm">Broker: {account.broker}</p>
                    )}
                    <Badge variant="secondary" className="mt-1">
                      {account.account_type}
                    </Badge>
                  </div>
                  <span className="text-gray-300 font-medium">{account.currency}</span>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-gray-400 text-sm">
                    {getAccountHoldingsCount(account.id)} holdings
                  </span>
                  <span className="font-medium">
                    CHF {getAccountTotalValue(account.id).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Holdings Table */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Holdings</h2>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Asset</TableHead>
                  <TableHead className="text-white">Type</TableHead>
                  <TableHead className="text-white">Account</TableHead>
                  <TableHead className="text-white text-right">Qty</TableHead>
                  <TableHead className="text-white text-right">Avg Buy Price (CHF)</TableHead>
                  <TableHead className="text-white text-right">Current Value (CHF)</TableHead>
                  <TableHead className="text-white text-right">Gain/Loss CHF</TableHead>
                  <TableHead className="text-white text-right">Gain/Loss %</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map(holding => {
                  const account = accounts.find(a => a.id === holding.account_id)
                  const gainLoss = holding.current_value_chf && holding.quantity && holding.average_buy_price 
                    ? holding.current_value_chf - (holding.quantity * holding.average_buy_price) 
                    : 0
                  const gainLossPercent = holding.current_value_chf && holding.quantity && holding.average_buy_price 
                    ? ((holding.current_value_chf - (holding.quantity * holding.average_buy_price)) / (holding.quantity * holding.average_buy_price)) * 100
                    : 0
                  
                  return (
                    <TableRow key={holding.id}>
                      <TableCell className="font-medium">{holding.asset_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {holding.asset_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{account?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{holding.quantity?.toFixed(4)}</TableCell>
                      <TableCell className="text-right">CHF {holding.average_buy_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">CHF {holding.current_value_chf?.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-medium ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        CHF {gainLoss.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${gainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gainLossPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingHolding(holding)
                            setEditHoldingForm({ current_value_chf: holding.current_value_chf || 0 })
                            setIsEditHoldingModalOpen(true)
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Account Modal */}
      <Dialog open={isAddAccountModalOpen} onOpenChange={setIsAddAccountModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle>Add Investment Account</DialogTitle>
            <DialogDescription>
              Create a new investment account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-name">Account Name *</Label>
              <Input
                id="account-name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                placeholder="e.g. Brokerage Account"
              />
            </div>
            
            <div>
              <Label htmlFor="account-broker">Broker</Label>
              <Input
                id="account-broker"
                value={newAccount.broker}
                onChange={(e) => setNewAccount({...newAccount, broker: e.target.value})}
                placeholder="e.g. Swissquote"
              />
            </div>
            
            <div>
              <Label htmlFor="account-type">Account Type</Label>
              <Select 
                value={newAccount.account_type} 
                onValueChange={(value) => setNewAccount({...newAccount, account_type: value as any})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="bonds">Bonds</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="account-currency">Currency</Label>
              <Input
                id="account-currency"
                value={newAccount.currency}
                onChange={(e) => setNewAccount({...newAccount, currency: e.target.value})}
                placeholder="CHF"
              />
            </div>
            
            <div>
              <Label htmlFor="account-notes">Notes</Label>
              <Input
                id="account-notes"
                value={newAccount.notes}
                onChange={(e) => setNewAccount({...newAccount, notes: e.target.value})}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddAccount}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holding Modal */}
      <Dialog open={isEditHoldingModalOpen} onOpenChange={setIsEditHoldingModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle>Update Holding Value</DialogTitle>
            <DialogDescription>
              Update the current value of this holding
            </DialogDescription>
          </DialogHeader>
          {editingHolding && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="holding-asset">Asset</Label>
                <p className="text-white">{editingHolding.asset_name}</p>
              </div>
              
              <div>
                <Label htmlFor="holding-current-value">Current Value (CHF)</Label>
                <Input
                  id="holding-current-value"
                  type="number"
                  value={editHoldingForm.current_value_chf}
                  onChange={(e) => setEditHoldingForm({...editHoldingForm, current_value_chf: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              {editingHolding.current_value_chf && editingHolding.quantity && editingHolding.average_buy_price && (
                <div className="bg-gray-700 p-3 rounded">
                  <p className="text-sm text-gray-300">Gain/Loss Preview:</p>
                  <p className={`font-medium ${editingHolding.current_value_chf - (editingHolding.quantity * editingHolding.average_buy_price) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    CHF {(editingHolding.current_value_chf - (editingHolding.quantity * editingHolding.average_buy_price)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={handleUpdateHolding}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Update Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
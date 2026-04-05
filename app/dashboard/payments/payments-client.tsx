'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Search,
  Calendar,
  DollarSign,
  Mail,
  Hash,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  CalendarDays,
  Bell,
  Wifi
} from 'lucide-react'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import type { Payment } from '@/types'

import { DatePickerWithRange } from '@/components/ui/date-range-picker'

import { cn } from '@/lib/utils'

type SortKey = 'created_at' | 'amount' | 'event_type' | 'status'
type SortDir = 'asc' | 'desc'

const EVENT_TYPE_LABELS: Record<string, string> = {
  'payment_intent.succeeded': 'Payment Succeeded',
  'payment_intent.failed': 'Payment Failed',
  'payment_intent.created': 'Payment Created',
  'payment_intent.partially_funded': 'Partially Funded',
  'payment_intent.canceled': 'Payment Canceled',
  'charge.succeeded': 'Charge Succeeded',
  'charge.failed': 'Charge Failed',
  'charge.refunded': 'Charge Refunded',
  'customer.subscription.created': 'Subscription Created',
  'customer.subscription.updated': 'Subscription Updated',
  'customer.subscription.deleted': 'Subscription Deleted',
  'invoice.paid': 'Invoice Paid',
  'invoice.payment_failed': 'Invoice Payment Failed',
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  canceled: 'bg-gray-100 text-gray-800 border-gray-200',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  canceled: <AlertCircle className="h-4 w-4" />,
  unknown: <AlertCircle className="h-4 w-4" />,
}

interface PaymentClientProps {
  payments: Payment[]
}

export function PaymentsClient({ payments: initialPayments }: PaymentClientProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [newEventsCount, setNewEventsCount] = useState(0)

  // UI state
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterEventType, setFilterEventType] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  
  // Date range filter - simple select approach
  const [dateRange, setDateRange] = useState<string>('30days') // 'today', '7days', '30days', '90days', 'all'

  // Polling interval in milliseconds
  const POLLING_INTERVAL = 10000 // 10 seconds

  // Fetch payments function
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
        setLastUpdate(new Date())
        
        // Check for new events
        if (data.length > payments.length) {
          setNewEventsCount(data.length - payments.length)
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [payments.length])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchPayments()
    
    // Set up polling interval
    let intervalId: NodeJS.Timeout
    
    if (polling) {
      intervalId = setInterval(fetchPayments, POLLING_INTERVAL)
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fetchPayments, polling])

  // Toggle polling
  const togglePolling = () => {
    setPolling(!polling)
    if (!polling) {
      fetchPayments()
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    fetchPayments()
    setNewEventsCount(0)
  }

  // Sort handler
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  // Filtered + sorted payments
  const filteredPayments = useMemo(() => {
    let r = [...payments]

    // Filter by status
    if (filterStatus !== 'all') r = r.filter(p => p.status === filterStatus)
    
    // Filter by event type
    if (filterEventType !== 'all') r = r.filter(p => p.event_type === filterEventType)
    
    // Filter by date range
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (dateRange) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0)
        break
      case '7days':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30days':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90days':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case 'all':
        // No filtering for 'all'
        cutoffDate.setFullYear(2000) // Very old date
        break
      default:
        cutoffDate.setDate(now.getDate() - 30) // Default 30 days
    }
    
    if (dateRange !== 'all') {
      r = r.filter(p => new Date(p.created_at) >= cutoffDate)
    }
    
    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p =>
        p.customer_email?.toLowerCase().includes(q) ||
        p.stripe_payment_intent_id?.toLowerCase().includes(q) ||
        p.booking_id?.toLowerCase().includes(q) ||
        p.event_type?.toLowerCase().includes(q)
      )
    }

    return r.sort((a, b) => {
      if (sortKey === 'created_at') {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA
      } else if (sortKey === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount
      } else {
        // For string fields
        const valueA = String(a[sortKey]).toLowerCase()
        const valueB = String(b[sortKey]).toLowerCase()
        return sortDir === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA)
      }
    })
  }, [payments, filterStatus, filterEventType, dateRange, search, sortKey, sortDir])

  // Get unique event types for filtering
  const eventTypes = useMemo(() => {
    const types = new Set(payments.map(p => p.event_type))
    return Array.from(types).sort()
  }, [payments])

  // Format status badge with icon
  const StatusBadge = ({ status }: { status: string }) => (
    <Badge className={`flex items-center gap-1 ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
      {STATUS_ICONS[status] || <Clock className="h-4 w-4" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )

  // Format event type for display
  const formatEventType = (eventType: string) => {
    return EVENT_TYPE_LABELS[eventType] || eventType
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant={polling ? "default" : "outline"}
            size="sm"
            onClick={togglePolling}
            className="flex items-center gap-2"
          >
            <Wifi className={`h-4 w-4 ${polling ? 'text-green-500' : ''}`} />
            {polling ? 'Live Updates ON' : 'Live Updates OFF'}
          </Button>
          
          {newEventsCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <Bell className="h-3 w-3 mr-1" />
              {newEventsCount} new
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Total Amount</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {formatChf(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
          </p>
        </div>
        
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Successful</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {payments.filter(p => p.status === 'succeeded').length}
          </p>
        </div>
        
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium">Failed</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {payments.filter(p => p.status === 'failed').length}
          </p>
        </div>
        
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {payments.filter(p => p.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="border rounded-lg bg-white">
        <div className="p-4 border-b flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Date Range:</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="30 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Event Type:</span>
            <Select value={filterEventType} onValueChange={setFilterEventType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type} value={type}>{formatEventType(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterStatus('all')
              setFilterEventType('all')
              setDateRange('30days')
              setSearch('')
            }}
            className="ml-auto"
          >
            Clear Filters
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead className="w-24">Amount</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-48">Customer Email</TableHead>
              <TableHead className="w-32">Booking ID</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <>
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDateCh(payment.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{formatEventType(payment.event_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatChf(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.customer_email || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.booking_id ? (
                        <span className="font-mono text-xs">{payment.booking_id.substring(0, 8)}...</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(payment.id)}
                      >
                        {expandedRow === payment.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRow === payment.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-4 bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium">Event Details</h4>
                            <pre className="text-xs p-2 bg-gray-100 rounded mt-1 overflow-auto max-h-60">
                              {JSON.stringify(payment, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
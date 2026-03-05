'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton-table'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { Settings, Building2, CalendarDays, Bell, Download, Plus, Check, X, Users } from 'lucide-react'
import { addPersonalProfile } from '@/app/actions/profile'
import type { Profile, TaxYear } from '@/types'

const CH_CANTONS = [
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR',
  'JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG',
  'TI','UR','VD','VS','ZG','ZH',
]

const CANTON_NAMES: Record<string, string> = {
  AG:'Aargau', AI:'Appenzell Innerrhoden', AR:'Appenzell Ausserrhoden', BE:'Bern',
  BL:'Basel-Landschaft', BS:'Basel-Stadt', FR:'Fribourg', GE:'Geneva', GL:'Glarus',
  GR:'Graubünden', JU:'Jura', LU:'Lucerne', NE:'Neuchâtel', NW:'Nidwalden',
  OW:'Obwalden', SG:'St. Gallen', SH:'Schaffhausen', SO:'Solothurn', SZ:'Schwyz',
  TG:'Thurgau', TI:'Ticino', UR:'Uri', VD:'Vaud', VS:'Valais', ZG:'Zug', ZH:'Zurich',
}

interface UserSettings {
  default_vat_rate: number
  mwst_reminder_30d: boolean
  mwst_reminder_7d: boolean
  mwst_reminder_1d: boolean
}

export default function SettingsPage() {
  const supabase = createClient()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [taxYears, setTaxYears] = useState<TaxYear[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    default_vat_rate: 8.1,
    mwst_reminder_30d: true,
    mwst_reminder_7d: true,
    mwst_reminder_1d: true,
  })

  const [profileForm, setProfileForm] = useState({ name: '', uid_mwst: '', address: '', canton: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [addingYear, setAddingYear] = useState(false)
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()))

  const [prefSaving, setPrefSaving] = useState(false)

  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()))
  const [exporting, setExporting] = useState(false)

  const [addingProfile, setAddingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileCanton, setNewProfileCanton] = useState('ZH')
  const [addingProfileLoading, setAddingProfileLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profiles }, { data: syRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).order('type'),
        supabase.from('user_settings').select('*').eq('user_id', user.id).limit(1),
      ])

      if (profiles?.length) {
        setAllProfiles(profiles as Profile[])
        const p = profiles[0] as Profile
        setProfile(p)
        setProfileForm({ name: p.name ?? '', uid_mwst: p.uid_mwst ?? '', address: p.address ?? '', canton: p.canton ?? '' })

        const { data: years } = await supabase
          .from('tax_years')
          .select('*')
          .eq('profile_id', p.id)
          .order('year', { ascending: false })
        setTaxYears((years ?? []) as TaxYear[])
      }

      if (syRows?.length) {
        const s = syRows[0]
        setSettings({
          default_vat_rate: s.default_vat_rate ?? 8.1,
          mwst_reminder_30d: s.mwst_reminder_30d ?? true,
          mwst_reminder_7d: s.mwst_reminder_7d ?? true,
          mwst_reminder_1d: s.mwst_reminder_1d ?? true,
        })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!profile) return
    setProfileError('')

    if (profileForm.uid_mwst) {
      const mwstRegex = /^CHE-\d{3}\.\d{3}\.\d{3} MWST$/
      if (!mwstRegex.test(profileForm.uid_mwst)) {
        setProfileError(t('uidMwstError'))
        return
      }
    }

    setProfileSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profileForm.name,
        uid_mwst: profileForm.uid_mwst || null,
        address: profileForm.address || null,
        canton: profileForm.canton || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success(t('saveProfile'))
      setProfile(prev => prev ? { ...prev, ...profileForm } : prev)
    }
    setProfileSaving(false)
  }

  async function toggleTaxYearStatus(ty: TaxYear) {
    const next = ty.status === 'open' ? 'closed' : 'open'
    const { error } = await supabase.from('tax_years').update({ status: next }).eq('id', ty.id)
    if (error) {
      toast.error('Failed to update tax year')
    } else {
      toast.success(`Tax year ${ty.year} ${next}`)
      setTaxYears(prev => prev.map(y => y.id === ty.id ? { ...y, status: next } : y))
    }
  }

  async function addTaxYear() {
    if (!profile) return
    const year = parseInt(newYear)
    if (isNaN(year) || year < 2020 || year > 2035) {
      toast.error('Enter a valid year (2020–2035)')
      return
    }
    if (taxYears.some(y => y.year === year)) {
      toast.error(`Tax year ${year} already exists`)
      return
    }
    const { data, error } = await supabase.from('tax_years')
      .insert({ profile_id: profile.id, year, status: 'open' })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add tax year')
    } else {
      toast.success(`Tax year ${year} added`)
      setTaxYears(prev => [data as TaxYear, ...prev])
      setAddingYear(false)
    }
  }

  async function savePreferences() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setPrefSaving(true)
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      toast.error('Failed to save preferences')
    } else {
      toast.success(t('savePreferences'))
    }
    setPrefSaving(false)
  }

  async function handleAddProfile() {
    if (!newProfileName.trim()) return
    setAddingProfileLoading(true)
    const fd = new FormData()
    fd.set('name', newProfileName.trim())
    fd.set('canton', newProfileCanton)
    const result = await addPersonalProfile(fd)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Profile "${newProfileName.trim()}" added!`)
      setNewProfileName('')
      setNewProfileCanton('ZH')
      setAddingProfile(false)
      await loadAll()
    }
    setAddingProfileLoading(false)
  }

  function buildCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
    const header = columns.map(c => `"${c.label}"`).join(',')
    const body = rows.map(row =>
      columns.map(c => {
        const v = row[c.key]
        if (v == null) return ''
        if (typeof v === 'number') return v.toFixed(2)
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')
    return header + '\n' + body
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportIncome() {
    if (!profile) return
    setExporting(true)
    try {
      const taxYear = taxYears.find(y => y.year === parseInt(exportYear))
      let q = supabase.from('income').select('*').eq('profile_id', profile.id)
      if (taxYear) q = q.eq('tax_year_id', taxYear.id)
      const { data, error } = await q.order('date')
      if (error) throw error
      const csv = buildCSV(data ?? [], [
        { key: 'date',           label: 'Date' },
        { key: 'description',    label: 'Description' },
        { key: 'client',         label: 'Client' },
        { key: 'invoice_number', label: 'Invoice No.' },
        { key: 'amount_chf',     label: 'Amount CHF' },
        { key: 'vat_rate',       label: 'VAT Rate %' },
        { key: 'vat_amount',     label: 'VAT Amount CHF' },
        { key: 'net_amount',     label: 'Net Amount CHF' },
        { key: 'category',       label: 'Category' },
      ])
      downloadCSV(csv, `luxgo-income-${exportYear}.csv`)
      toast.success(`Income exported for ${exportYear}`)
    } catch {
      toast.error('Export failed')
    }
    setExporting(false)
  }

  async function exportExpenses() {
    if (!profile) return
    setExporting(true)
    try {
      const taxYear = taxYears.find(y => y.year === parseInt(exportYear))
      let q = supabase.from('expenses').select('*').eq('profile_id', profile.id)
      if (taxYear) q = q.eq('tax_year_id', taxYear.id)
      const { data, error } = await q.order('date')
      if (error) throw error
      const csv = buildCSV(data ?? [], [
        { key: 'date',          label: 'Date' },
        { key: 'description',   label: 'Description' },
        { key: 'vendor',        label: 'Vendor' },
        { key: 'amount_chf',    label: 'Amount CHF' },
        { key: 'vat_rate',      label: 'VAT Rate %' },
        { key: 'vat_amount',    label: 'VAT Amount CHF' },
        { key: 'net_amount',    label: 'Net Amount CHF' },
        { key: 'category',      label: 'Category' },
        { key: 'is_deductible', label: 'Deductible' },
      ])
      downloadCSV(csv, `luxgo-expenses-${exportYear}.csv`)
      toast.success(`Expenses exported for ${exportYear}`)
    } catch {
      toast.error('Export failed')
    }
    setExporting(false)
  }

  const yearOptions = Array.from({ length: 7 }, (_, i) => String(2024 + i - 2))

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
            <Settings className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="bg-gray-900 border border-gray-800 p-1">
              <TabsTrigger value="profile" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
                <Building2 className="h-4 w-4 mr-2" />Profile
              </TabsTrigger>
              <TabsTrigger value="tax-years" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
                <CalendarDays className="h-4 w-4 mr-2" />{t('taxYears')}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
                <Bell className="h-4 w-4 mr-2" />{t('preferences')}
              </TabsTrigger>
              <TabsTrigger value="export" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
                <Download className="h-4 w-4 mr-2" />{t('export')}
              </TabsTrigger>
              <TabsTrigger value="profiles" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
                <Users className="h-4 w-4 mr-2" />Profiles
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">{t('companyProfile')}</CardTitle>
                  <CardDescription className="text-gray-400">{t('companyDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('companyName')}</Label>
                    <Input
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="LuxGo GmbH"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      UID MWST Number
                      <span className="ml-2 text-xs text-gray-500">Format: CHE-123.456.789 MWST</span>
                    </Label>
                    <Input
                      value={profileForm.uid_mwst}
                      onChange={e => setProfileForm(p => ({ ...p, uid_mwst: e.target.value }))}
                      placeholder="CHE-123.456.789 MWST"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500 font-mono"
                    />
                    {profileError && <p className="text-xs text-red-400">{profileError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('address')}</Label>
                    <Input
                      value={profileForm.address}
                      onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Bahnhofstrasse 1, 8001 Zürich"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('canton')}</Label>
                    <Select value={profileForm.canton} onValueChange={v => setProfileForm(p => ({ ...p, canton: v }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-amber-500">
                        <SelectValue placeholder="Select canton" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 max-h-72">
                        {CH_CANTONS.map(code => (
                          <SelectItem key={code} value={code} className="text-white">{code} — {CANTON_NAMES[code]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={saveProfile} disabled={profileSaving} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                    {profileSaving ? tCommon('saving') : t('saveProfile')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Years Tab */}
            <TabsContent value="tax-years">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{t('taxYearsTitle')}</CardTitle>
                      <CardDescription className="text-gray-400">{t('taxYearsDesc')}</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setAddingYear(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                      <Plus className="h-4 w-4 mr-1" /> {t('addYear')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addingYear && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700">
                      <Input value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="2025"
                        className="w-28 bg-gray-700 border-gray-600 text-white"
                        onKeyDown={e => { if (e.key === 'Enter') addTaxYear() }} autoFocus />
                      <Button size="sm" onClick={addTaxYear} className="bg-amber-500 hover:bg-amber-400 text-black"><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingYear(false)} className="border-gray-600 text-gray-400 hover:text-white"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                  {taxYears.length === 0 && !addingYear ? (
                    <p className="text-gray-500 text-sm py-4 text-center">No tax years yet — add one to get started</p>
                  ) : (
                    taxYears.map(ty => {
                      const isCurrent = ty.year === new Date().getFullYear()
                      return (
                        <div key={ty.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-mono font-semibold text-lg">{ty.year}</span>
                            {isCurrent && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Current</Badge>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ty.status === 'open' ? 'bg-green-900/40 text-green-400 border-green-800' : ty.status === 'submitted' ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                              {ty.status.charAt(0).toUpperCase() + ty.status.slice(1)}
                            </span>
                            <button onClick={() => toggleTaxYearStatus(ty)} className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2">
                              {ty.status === 'open' ? t('closeYear') : t('reopen')}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">{t('preferencesTitle')}</CardTitle>
                  <CardDescription className="text-gray-400">Default VAT rate and MWST deadline notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('defaultVatRate')}</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" step="0.1" min="0" max="100" value={settings.default_vat_rate}
                        onChange={e => setSettings(s => ({ ...s, default_vat_rate: parseFloat(e.target.value) || 8.1 }))}
                        className="w-32 bg-gray-800 border-gray-700 text-white focus:border-amber-500" />
                      <span className="text-gray-500 text-sm">{t('standardVat')}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-gray-300">{t('mwstReminders')}</Label>
                    <p className="text-xs text-gray-500">Swiss MWST quarters are due 60 days after quarter end. Get notified before deadlines.</p>
                    {[
                      { key: 'mwst_reminder_30d' as const, label: '30 days before deadline' },
                      { key: 'mwst_reminder_7d' as const, label: '7 days before deadline' },
                      { key: 'mwst_reminder_1d' as const, label: '1 day before deadline' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer group">
                        <div onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${settings[key] ? 'bg-amber-500 border-amber-500' : 'bg-gray-800 border-gray-600 group-hover:border-gray-500'}`}>
                          {settings[key] && <Check className="h-3 w-3 text-black" />}
                        </div>
                        <span className="text-gray-300 text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={savePreferences} disabled={prefSaving} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                    {prefSaving ? tCommon('saving') : t('savePreferences')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">{t('exportTitle')}</CardTitle>
                  <CardDescription className="text-gray-400">Download your income and expenses as Excel-compatible CSV</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Tax Year</Label>
                    <Select value={exportYear} onValueChange={setExportYear}>
                      <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white focus:border-amber-500"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        {yearOptions.map(y => <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-800 p-4 space-y-3">
                      <div>
                        <p className="text-white font-medium text-sm">{tCommon('income') ?? 'Income'} CSV</p>
                        <p className="text-gray-500 text-xs mt-1">Date, Client, Amount, VAT, Net, Category, Invoice No.</p>
                      </div>
                      <Button onClick={exportIncome} disabled={exporting} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                        <Download className="h-4 w-4 mr-2" />Export Income
                      </Button>
                    </div>
                    <div className="rounded-xl border border-gray-800 p-4 space-y-3">
                      <div>
                        <p className="text-white font-medium text-sm">{tCommon('expenses') ?? 'Expenses'} CSV</p>
                        <p className="text-gray-500 text-xs mt-1">Date, Vendor, Amount, VAT, Net, Category, Deductible</p>
                      </div>
                      <Button onClick={exportExpenses} disabled={exporting} variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800">
                        <Download className="h-4 w-4 mr-2" />Export Expenses
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 border border-gray-800 px-4 py-3 text-xs text-gray-500">
                    💡 CSV files use UTF-8 with BOM for correct Excel display of Swiss characters (ä, ö, ü). Open in Excel → Data → From Text/CSV for best results.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profiles Tab */}
            <TabsContent value="profiles">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Profiles</CardTitle>
                      <CardDescription className="text-gray-400">Manage your business and personal profiles</CardDescription>
                    </div>
                    {!addingProfile && (
                      <Button size="sm" onClick={() => setAddingProfile(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                        <Plus className="h-4 w-4 mr-1" /> Add Personal Profile
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addingProfile && (
                    <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 space-y-3">
                      <p className="text-sm font-medium text-white">New Personal Profile</p>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Name</Label>
                        <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                          placeholder="e.g. Gulay" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAddProfile(); if (e.key === 'Escape') { setAddingProfile(false); setNewProfileName('') } }}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-amber-500" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Canton</Label>
                        <Select value={newProfileCanton} onValueChange={setNewProfileCanton}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-amber-500"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-800 max-h-72">
                            {CH_CANTONS.map(code => (
                              <SelectItem key={code} value={code} className="text-white">{code} — {CANTON_NAMES[code]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddProfile} disabled={addingProfileLoading || !newProfileName.trim()}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                          <Check className="h-4 w-4 mr-1" />{addingProfileLoading ? 'Adding...' : 'Add Profile'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setAddingProfile(false); setNewProfileName('') }}
                          className="border-gray-600 text-gray-400 hover:text-white">
                          <X className="h-4 w-4 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {allProfiles.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">No profiles found</p>
                  ) : (
                    allProfiles.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.type === 'business' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                            {p.type === 'business'
                              ? <Building2 className="h-4 w-4 text-amber-400" />
                              : <Users className="h-4 w-4 text-blue-400" />}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{p.name}</p>
                            <p className="text-gray-500 text-xs">{p.canton ?? '—'}</p>
                          </div>
                        </div>
                        <Badge className={p.type === 'business'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
                          {p.type}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        )}
      </div>
    </div>
  )
}

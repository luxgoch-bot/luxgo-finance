'use client'

import { useState, useMemo, useEffect } from 'react'
import { updateTaxYearNotes } from '@/app/actions/tax-year'
import {
  estimatePersonalTax,
  DEDUCTION_LIMITS_2024,
  PERSONAL_CHECKLIST,
  type PersonalIncome,
  type PersonalDeductions,
} from '@/lib/helpers/personal-tax'
import { formatChf } from '@/lib/helpers/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Loader2,
  User,
} from 'lucide-react'
import type { Income, Expense, TaxYear, Profile, InvestmentHolding, InvestmentTransaction } from '@/types'

interface PersonalTaxTabProps {
  profile:                 Profile
  year:                    number
  income:                  Income[]
  expenses:                Expense[]
  taxYear?:                TaxYear
  businessSalaryExpenses:  Expense[]
  holdings?:               InvestmentHolding[]
  investmentTx?:           InvestmentTransaction[]
}

const CHECKLIST_STORAGE_KEY = (profileId: string, year: number) =>
  `personal_checklist_${profileId}_${year}`

const INCOME_STORAGE_KEY    = (profileId: string, year: number) =>
  `personal_income_${profileId}_${year}`
const DEDUCTIONS_STORAGE_KEY = (profileId: string, year: number) =>
  `personal_deductions_${profileId}_${year}`

function inputNum(val: number | string): number {
  return typeof val === 'string' ? parseFloat(val) || 0 : val
}

export function PersonalTaxTab({
  profile,
  year,
  income,
  expenses,
  taxYear,
  businessSalaryExpenses,
  holdings = [],
  investmentTx = [],
}: PersonalTaxTabProps) {
  // ── Income state ────────────────────────────────────────────────────────
  const derivedSalary = useMemo(() =>
    businessSalaryExpenses.reduce((s, e) => s + e.amount_chf, 0),
    [businessSalaryExpenses]
  )

  const [incomeFields, setIncomeFields] = useState<PersonalIncome>({
    salaryGross:      derivedSalary,
    sideIncome:       0,
    investmentIncome: 0,
    otherIncome:      0,
  })

  // ── Deductions state ────────────────────────────────────────────────────
  const [deductions, setDeductions] = useState<PersonalDeductions>({
    saeule3a:          0,
    workExpensesFlat:  true,
    workExpensesActual: 0,
    transportOv:       0,
    transportKm:       0,
    healthInsurance:   0,
    donations:         0,
    childcare:         0,
    otherDeductions:   0,
  })

  // ── Checklist state ─────────────────────────────────────────────────────
  const [checklist, setChecklist]     = useState<Set<string>>(new Set())
  const [notes, setNotes]             = useState(taxYear?.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMsg, setNotesMsg]       = useState<string | null>(null)

  // Load from localStorage
  useEffect(() => {
    const ic = localStorage.getItem(INCOME_STORAGE_KEY(profile.id, year))
    if (ic) {
      try {
        const parsed = JSON.parse(ic) as Partial<PersonalIncome>
        setIncomeFields(prev => ({
          ...prev,
          ...parsed,
          // salary derived from DB takes precedence if non-zero
          salaryGross: derivedSalary > 0 ? derivedSalary : (parsed.salaryGross ?? 0),
        }))
      } catch {}
    } else if (derivedSalary > 0) {
      setIncomeFields(prev => ({ ...prev, salaryGross: derivedSalary }))
    }

    const dc = localStorage.getItem(DEDUCTIONS_STORAGE_KEY(profile.id, year))
    if (dc) {
      try { setDeductions(JSON.parse(dc)) } catch {}
    }

    const cl = localStorage.getItem(CHECKLIST_STORAGE_KEY(profile.id, year))
    if (cl) {
      try { setChecklist(new Set(JSON.parse(cl))) } catch {}
    }
  }, [profile.id, year, derivedSalary])

  function updateIncome(field: keyof PersonalIncome, value: string) {
    setIncomeFields(prev => {
      const next = { ...prev, [field]: parseFloat(value) || 0 }
      localStorage.setItem(INCOME_STORAGE_KEY(profile.id, year), JSON.stringify(next))
      return next
    })
  }

  function updateDeduction(field: keyof PersonalDeductions, value: string | boolean) {
    setDeductions(prev => {
      const next = {
        ...prev,
        [field]: typeof value === 'boolean' ? value : (parseFloat(value as string) || 0),
      }
      localStorage.setItem(DEDUCTIONS_STORAGE_KEY(profile.id, year), JSON.stringify(next))
      return next
    })
  }

  function toggleChecklist(id: string) {
    setChecklist(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(
        CHECKLIST_STORAGE_KEY(profile.id, year),
        JSON.stringify(Array.from(next))
      )
      return next
    })
  }

  async function handleSaveNotes() {
    if (!taxYear) return
    setSavingNotes(true)
    await updateTaxYearNotes(taxYear.id, notes)
    setSavingNotes(false)
    setNotesMsg('Saved.')
    setTimeout(() => setNotesMsg(null), 2000)
  }

  // ── Investment KPIs ──────────────────────────────────────────────────────
  const portfolioValueForWealthTax = useMemo(
    () => holdings.reduce((s, h) => s + (h.current_value_chf ?? 0), 0),
    [holdings]
  )
  const dividendIncomeYtd = useMemo(
    () => investmentTx.reduce((s, t) => s + t.total_amount_chf, 0),
    [investmentTx]
  )

  // ── Tax calculation ──────────────────────────────────────────────────────
  const result = useMemo(() =>
    estimatePersonalTax(incomeFields, deductions),
    [incomeFields, deductions]
  )

  const checklistProgress = Math.round((checklist.size / PERSONAL_CHECKLIST.length) * 100)

  const inputCls = 'h-8 text-sm border-gray-200 focus:border-amber-500 bg-white'
  const labelCls = 'text-xs font-medium text-gray-600'

  return (
    <div className="space-y-5">
      {/* Income Inputs ───────────────────────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold text-gray-800">
              Income — {year}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Salary (Lohn) — gross CHF
                {derivedSalary > 0 && (
                  <span className="ml-1 text-blue-500">(from LuxGo salary expenses)</span>
                )}
              </Label>
              <Input
                type="number"
                value={incomeFields.salaryGross || ''}
                onChange={e => updateIncome('salaryGross', e.target.value)}
                placeholder="e.g. 120000"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Side income (Nebenerwerb) CHF</Label>
              <Input
                type="number"
                value={incomeFields.sideIncome || ''}
                onChange={e => updateIncome('sideIncome', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Investment income (Dividends, interest) CHF</Label>
              <Input
                type="number"
                value={incomeFields.investmentIncome || ''}
                onChange={e => updateIncome('investmentIncome', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Other taxable income CHF</Label>
              <Input
                type="number"
                value={incomeFields.otherIncome || ''}
                onChange={e => updateIncome('otherIncome', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Wizard ───────────────────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-sm font-semibold text-gray-800">
              Deduction Wizard — Zurich {year}
            </CardTitle>
            <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
              Total: {formatChf(result.totalDeductions)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <Accordion type="multiple" defaultValue={['pillar3', 'work']} className="space-y-2">

            {/* 3. Säule */}
            <AccordionItem value="pillar3" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>🏦 3. Säule A Contributions</span>
                  {deductions.saeule3a > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(Math.min(deductions.saeule3a, DEDUCTION_LIMITS_2024.saeule3a_employed))}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-2">
                <div className="space-y-1.5">
                  <Label className={labelCls}>
                    Amount contributed (max CHF {DEDUCTION_LIMITS_2024.saeule3a_employed.toLocaleString('de-CH')})
                  </Label>
                  <Input
                    type="number"
                    value={deductions.saeule3a || ''}
                    onChange={e => updateDeduction('saeule3a', e.target.value)}
                    placeholder={`Max ${DEDUCTION_LIMITS_2024.saeule3a_employed}`}
                    className={inputCls}
                    max={DEDUCTION_LIMITS_2024.saeule3a_employed}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Contributions to 3rd pillar (bank or insurance) are fully deductible up to the annual maximum.
                  You need the Einzahlungsbestätigung from your provider.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Work expenses */}
            <AccordionItem value="work" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>💼 Work Expenses (Berufskosten)</span>
                  {result.deductionBreakdown['Work expenses (Berufskosten)'] > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(result.deductionBreakdown['Work expenses (Berufskosten)'])}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    id="workFlat"
                    checked={deductions.workExpensesFlat}
                    onChange={e => updateDeduction('workExpensesFlat', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500"
                  />
                  <label htmlFor="workFlat" className="text-sm text-gray-700 cursor-pointer">
                    Use flat deduction (Pauschalabzug): CHF {DEDUCTION_LIMITS_2024.workExpensesFlat.toLocaleString('de-CH')}
                  </label>
                </div>
                {!deductions.workExpensesFlat && (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Actual work expenses (CHF)</Label>
                    <Input
                      type="number"
                      value={deductions.workExpensesActual || ''}
                      onChange={e => updateDeduction('workExpensesActual', e.target.value)}
                      placeholder="Actual amount"
                      className={inputCls}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Transport */}
            <AccordionItem value="transport" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>🚇 Transport (Fahrtkosten)</span>
                  {result.deductionBreakdown['Transport'] > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(result.deductionBreakdown['Transport'])}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Public transport actual cost (ÖV, CHF)</Label>
                    <Input
                      type="number"
                      value={deductions.transportOv || ''}
                      onChange={e => updateDeduction('transportOv', e.target.value)}
                      placeholder="e.g. 1200"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Car km to work (one-way, days × 2 × km)</Label>
                    <Input
                      type="number"
                      value={deductions.transportKm || ''}
                      onChange={e => updateDeduction('transportKm', e.target.value)}
                      placeholder="e.g. 4600"
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Car: CHF 0.70/km deductible, max CHF 5,000 (ZH canton). ÖV: actual costs. System takes the higher of the two.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Health insurance */}
            <AccordionItem value="health" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>🏥 Health Insurance (Krankenkasse)</span>
                  {result.deductionBreakdown['Health insurance (50%)'] > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(result.deductionBreakdown['Health insurance (50%)'])}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-2">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Annual premiums paid (CHF)</Label>
                  <Input
                    type="number"
                    value={deductions.healthInsurance || ''}
                    onChange={e => updateDeduction('healthInsurance', e.target.value)}
                    placeholder="e.g. 4800"
                    className={inputCls}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  50% of premiums are deductible for Zurich cantonal tax (simplified). Federal deduction depends on your situation.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Donations */}
            <AccordionItem value="donations" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>❤️ Donations (Spenden)</span>
                  {result.deductionBreakdown['Donations (Spenden)'] > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(result.deductionBreakdown['Donations (Spenden)'])}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-2">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Total donations to Swiss non-profits (CHF, min 100)</Label>
                  <Input
                    type="number"
                    value={deductions.donations || ''}
                    onChange={e => updateDeduction('donations', e.target.value)}
                    placeholder="e.g. 500"
                    className={inputCls}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Only donations to Swiss recognised non-profits qualify. Keep receipts.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Other */}
            <AccordionItem value="other" className="border border-gray-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-gray-700 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>📦 Other Deductions</span>
                  {deductions.otherDeductions > 0 && (
                    <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      − {formatChf(deductions.otherDeductions)}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Childcare (Drittbetreuung, max CHF {DEDUCTION_LIMITS_2024.childcareMax.toLocaleString('de-CH')})</Label>
                    <Input
                      type="number"
                      value={deductions.childcare || ''}
                      onChange={e => updateDeduction('childcare', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Other deductible items (CHF)</Label>
                    <Input
                      type="number"
                      value={deductions.otherDeductions || ''}
                      onChange={e => updateDeduction('otherDeductions', e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>

      {/* Tax Estimation Result ──────────────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-800">
            Personal Tax Estimation — Zürich {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-4">
          {/* Income → Deductions → Taxable */}
          <div className="space-y-2 rounded-xl border border-gray-200 p-4">
            {[
              { label: 'Total income', value: result.totalIncome, sign: '', color: 'text-gray-900' },
              { label: 'Total deductions', value: result.totalDeductions, sign: '−', color: 'text-blue-600' },
            ].map(({ label, value, sign, color }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className={`font-semibold tabular-nums ${color}`}>{sign} {formatChf(value)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Taxable income</span>
              <span className="text-base font-bold text-gray-900 tabular-nums">{formatChf(result.taxableIncome)}</span>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Federal Tax (DBSt)', sublabel: 'Progressive federal', value: result.federalTax, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-900' },
              { label: 'Cantonal Tax (ZH)', sublabel: 'Progressive cantonal', value: result.cantonalTax, bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
              { label: 'Municipal Tax', sublabel: 'Zürich city 119%', value: result.municipalTax, bg: 'bg-blue-50/50 border-blue-100', text: 'text-blue-600' },
            ].map(({ label, sublabel, value, bg, text }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xs text-gray-400">{sublabel}</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${text}`}>{formatChf(value)}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Estimated Total Tax</p>
              <p className="text-xs text-red-400 mt-0.5">
                Effective rate {result.effectiveRate}% · Marginal ~{result.marginalRate}%
              </p>
            </div>
            <p className="text-2xl font-bold text-red-700 tabular-nums">{formatChf(result.totalTax)}</p>
          </div>

          {/* Deduction breakdown */}
          {Object.keys(result.deductionBreakdown).length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Deductions applied
              </p>
              {Object.entries(result.deductionBreakdown).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-medium text-blue-600 tabular-nums">− {formatChf(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">{result.disclaimer}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes ─────────────────────────────────────────────────────── */}
      {taxYear && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-800">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Filing notes, Steuerberater contact, special deductions to clarify…"
              rows={3}
              className="text-sm text-gray-700 border-gray-200 resize-none focus:border-amber-500"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes} className="gap-1.5">
                {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save notes
              </Button>
              {notesMsg && <span className="text-xs text-emerald-600">{notesMsg}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investments — Swiss Tax Declaration ───────────────────────── */}
      <Card className="border-amber-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800">
              🇨🇭 Investments — Swiss Tax Declaration
            </CardTitle>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Capital Gains: TAX FREE</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Disclaimer */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
            <p><strong>Capital gains</strong> on movable assets (stocks, crypto, ETFs) are <strong className="text-green-700">TAX-FREE</strong> for private investors in Switzerland.</p>
            <p><strong>Dividends and interest</strong> are <strong className="text-red-700">taxable income</strong> — they must be declared under income.</p>
            <p><strong>All holdings</strong> must be declared annually for <strong>Vermögenssteuer</strong> (wealth tax) at year-end market value.</p>
            <p className="text-gray-500 italic">Note: Professional/high-frequency traders may be subject to income tax on gains — consult a tax advisor.</p>
          </div>

          {/* Investment KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Portfolio Value — Declare as Vermögen</p>
              <p className="text-2xl font-bold text-gray-900">{formatChf(portfolioValueForWealthTax)}</p>
              <p className="text-xs text-gray-400 mt-1">Year-end market value of all holdings ({year})</p>
              {holdings.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 italic">No holdings recorded yet — add via Investments module</p>
              )}
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs text-orange-600 mb-1">Dividend &amp; Interest Income — TAXABLE ⚠️</p>
              <p className="text-2xl font-bold text-orange-700">{formatChf(dividendIncomeYtd)}</p>
              <p className="text-xs text-orange-500 mt-1">Must be added to income declaration ({year})</p>
              {investmentTx.length === 0 && (
                <p className="text-xs text-orange-400 mt-2 italic">No dividend/interest recorded yet</p>
              )}
            </div>
          </div>

          {/* Holdings breakdown for declaration */}
          {holdings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Holdings to Declare (Vermögenssteuer)</p>
              <div className="rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 uppercase">
                      <th className="px-3 py-2 text-left">Asset</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Value (CHF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => (
                      <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {h.asset_name}
                          {h.asset_ticker && <span className="text-gray-400 ml-1">({h.asset_ticker})</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-500 capitalize">{h.asset_type ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {h.quantity != null ? Number(h.quantity).toFixed(4) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          {h.current_value_chf != null ? formatChf(h.current_value_chf) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-700" colSpan={3}>Total Vermögen (Investments)</td>
                      <td className="px-3 py-2 text-right text-gray-900">{formatChf(portfolioValueForWealthTax)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Submission Checklist ──────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800">
              Personal Tax Submission Checklist
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {checklist.size}/{PERSONAL_CHECKLIST.length} complete
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                checklistProgress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {checklistProgress}%
              </span>
            </div>
          </div>
          <Progress value={checklistProgress} className="mt-2 h-2" />
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {/* Deadline banner */}
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="text-xs text-blue-800">
              <strong>Deadline: 31 March {year + 1}</strong> — extend online at{' '}
              <a href="https://www.zh.ch" target="_blank" rel="noopener noreferrer" className="underline">zh.ch</a>
              {' '}(up to 30 Nov {year + 1} for individuals)
            </div>
          </div>

          <div className="space-y-1.5">
            {PERSONAL_CHECKLIST.map(item => {
              const done = checklist.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer select-none transition-colors ${
                    done ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleChecklist(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 shrink-0"
                  />
                  <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </label>
              )
            })}
          </div>

          {checklistProgress === 100 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">All done! 🎉</p>
                <p className="text-xs text-emerald-600">Personal tax is fully prepared for {year}.</p>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-xs font-medium text-gray-600 mb-1">Useful links:</p>
            <div className="space-y-1 text-xs">
              <a href="https://www.zh.ch/de/steuern-finanzen/steuern/steuerberechnung.html"
                target="_blank" rel="noopener noreferrer"
                className="block text-blue-600 hover:underline">
                → ZH Tax Calculator (official) — zh.ch
              </a>
              <a href="https://www.estv.admin.ch/estv/de/home/direkte-bundessteuer/dbst-natuerliche-personen.html"
                target="_blank" rel="noopener noreferrer"
                className="block text-blue-600 hover:underline">
                → ESTV — Federal direct tax info
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

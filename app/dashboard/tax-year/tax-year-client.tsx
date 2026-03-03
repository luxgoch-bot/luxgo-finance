'use client'

import { useState, useMemo } from 'react'
import { Building2, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BusinessTaxTab } from './business-tab'
import { PersonalTaxTab } from './personal-tab'
import type { Profile, TaxYear, Income, Expense, MwstReport } from '@/types'

interface TaxYearClientProps {
  profiles:      Profile[]
  allIncome:     Income[]
  allExpenses:   Expense[]
  taxYears:      TaxYear[]
  submittedMwst: (MwstReport & { tax_years?: { year: number } })[]
  currentYear:   number
}

export function TaxYearClient({
  profiles,
  allIncome,
  allExpenses,
  taxYears,
  submittedMwst,
  currentYear,
}: TaxYearClientProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  // Build list of years from data + always include current year
  const years = useMemo(() => {
    const set = new Set<number>([currentYear])
    taxYears.forEach(ty => set.add(ty.year))
    allIncome.forEach(i  => set.add(new Date(i.date).getFullYear()))
    allExpenses.forEach(e => set.add(new Date(e.date).getFullYear()))
    return Array.from(set).sort((a, b) => b - a)
  }, [taxYears, allIncome, allExpenses, currentYear])

  const businessProfile = profiles.find(p => p.type === 'business')
  const personalProfile = profiles.find(p => p.type === 'personal')

  // Filter data for selected year
  const yearIncome   = useMemo(() => allIncome.filter(i => new Date(i.date).getFullYear() === selectedYear), [allIncome, selectedYear])
  const yearExpenses = useMemo(() => allExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear), [allExpenses, selectedYear])

  // Check how many MWST quarters are submitted for this year
  const submittedMwstQuarters = useMemo(() =>
    submittedMwst.filter(r => r.tax_years?.year === selectedYear).map(r => r.quarter),
    [submittedMwst, selectedYear]
  )

  const defaultTab = businessProfile ? 'business' : 'personal'

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Annual Tax</h1>
          <p className="text-xs text-gray-400">Swiss tax estimation &amp; submission checklist</p>
        </div>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="h-8 w-28 text-sm border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </header>

      <div className="flex-1 p-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-5 bg-gray-100 p-1 rounded-xl">
            {businessProfile && (
              <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                <Building2 className="h-4 w-4 text-amber-500" />
                <span>LuxGo GmbH</span>
              </TabsTrigger>
            )}
            {personalProfile && (
              <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                <User className="h-4 w-4 text-blue-500" />
                <span>Dejan — Personal</span>
              </TabsTrigger>
            )}
          </TabsList>

          {businessProfile && (
            <TabsContent value="business">
              <BusinessTaxTab
                profile={businessProfile}
                year={selectedYear}
                income={yearIncome.filter(i => i.profile_id === businessProfile.id)}
                expenses={yearExpenses.filter(e => e.profile_id === businessProfile.id)}
                submittedMwstQuarters={submittedMwstQuarters}
                taxYear={taxYears.find(ty => ty.profile_id === businessProfile.id && ty.year === selectedYear)}
              />
            </TabsContent>
          )}

          {personalProfile && (
            <TabsContent value="personal">
              <PersonalTaxTab
                profile={personalProfile}
                year={selectedYear}
                income={yearIncome.filter(i => i.profile_id === personalProfile.id)}
                expenses={yearExpenses.filter(e => e.profile_id === personalProfile.id)}
                taxYear={taxYears.find(ty => ty.profile_id === personalProfile.id && ty.year === selectedYear)}
                // Pass salary from business expenses if any
                businessSalaryExpenses={yearExpenses.filter(e =>
                  e.profile_id === businessProfile?.id && e.category === 'salary'
                )}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

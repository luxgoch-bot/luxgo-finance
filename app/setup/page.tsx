'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createProfiles, addPersonalProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, User, Plus, X, Check } from 'lucide-react'

export default function SetupPage() {
  const t = useTranslations('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Additional personal profiles to create at setup
  const [extraProfiles, setExtraProfiles] = useState<string[]>([])
  const [addingProfile, setAddingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  function addExtra() {
    const name = newProfileName.trim()
    if (!name) return
    if (extraProfiles.includes(name)) return
    setExtraProfiles(p => [...p, name])
    setNewProfileName('')
    setAddingProfile(false)
  }

  function removeExtra(name: string) {
    setExtraProfiles(p => p.filter(n => n !== name))
  }

  async function handleSetup() {
    setLoading(true)
    setError(null)

    // Create the base profiles (GmbH + Dejan)
    const result = await createProfiles()
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Create any extra personal profiles
    for (const name of extraProfiles) {
      const fd = new FormData()
      fd.set('name', name)
      fd.set('canton', 'ZH')
      await addPersonalProfile(fd)
    }
    // createProfiles already redirects to /dashboard on success
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">LuxGo Finance</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{t('welcome')}</p>
        </div>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white">{t('yourProfiles')}</CardTitle>
            <CardDescription className="text-gray-400">
              {t('profilesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Profile — always created */}
            <div className="flex items-start gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <Building2 className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{t('businessProfile')}</p>
                <p className="text-sm text-gray-400">{t('businessDesc')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('businessFeatures')}</p>
              </div>
            </div>

            {/* Default personal profile */}
            <div className="flex items-start gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700">
                <User className="h-5 w-5 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-white">Dejan</p>
                <p className="text-sm text-gray-400">{t('personalDesc')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('personalFeatures')}</p>
              </div>
            </div>

            {/* Extra personal profiles */}
            {extraProfiles.map(name => (
              <div key={name} className="flex items-center gap-4 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                  <User className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{name}</p>
                  <p className="text-xs text-gray-500">Personal profile · Canton ZH</p>
                </div>
                <button onClick={() => removeExtra(name)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Add another personal profile */}
            {addingProfile ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="e.g. Gulay"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addExtra(); if (e.key === 'Escape') { setAddingProfile(false); setNewProfileName('') } }}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                />
                <Button size="sm" onClick={addExtra} className="bg-amber-500 hover:bg-amber-400 text-black shrink-0">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingProfile(false); setNewProfileName('') }}
                  className="border-gray-700 text-gray-400 hover:text-white shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingProfile(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors px-1"
              >
                <Plus className="h-4 w-4" />
                Add another personal profile
              </button>
            )}

            {error && (
              <div className="rounded-md bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold mt-2"
            >
              {loading ? t('settingUp') : t('createProfiles')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

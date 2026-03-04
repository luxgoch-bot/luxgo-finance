'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createProfiles } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, User } from 'lucide-react'

export default function SetupPage() {
  const t = useTranslations('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSetup() {
    setLoading(true)
    setError(null)
    const result = await createProfiles()
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
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
            {/* Business Profile */}
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

            {/* Personal Profile */}
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

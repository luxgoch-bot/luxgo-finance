'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/lib/locale-context'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tLang = useTranslations('language')
  const { locale, setLocale } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">LuxGo Finance</span>
          </div>
          <p className="text-gray-400 text-sm">Swiss Tax &amp; Accounting</p>
        </div>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xl">{t('signIn')}</CardTitle>
              {/* Language toggle on login page */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setLocale('en')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${locale === 'en' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {tLang('en')}
                </button>
                <button
                  onClick={() => setLocale('de')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${locale === 'de' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {tLang('de')}
                </button>
              </div>
            </div>
            <CardDescription className="text-gray-400">{t('signInDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">{t('password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                {loading ? t('signingIn') : t('signIn')}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              {t('noAccount')}{' '}
              <Link href="/signup" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                {t('signUp')}
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-6">{t('privateAccess')}</p>
      </div>
    </div>
  )
}

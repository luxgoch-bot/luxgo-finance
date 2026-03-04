'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const result = await signup(formData)
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
            <CardTitle className="text-white text-xl">Create account</CardTitle>
            <CardDescription className="text-gray-400">
              Set up your LuxGo Finance account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
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
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-gray-300">Confirm password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="Repeat password"
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
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-6">
          LuxGo Finance · Private Access Only
        </p>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import { useLocale } from '@/lib/locale-context'
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  CalendarDays,
  FolderOpen,
  LogOut,
  Receipt,
  Settings,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { locale, setLocale } = useLocale()

  const navItems = [
    { href: '/dashboard',              label: t('dashboard'),  icon: LayoutDashboard },
    { href: '/dashboard/income',       label: t('income'),     icon: TrendingUp },
    { href: '/dashboard/expenses',     label: t('expenses'),   icon: TrendingDown },
    { href: '/dashboard/mwst',         label: t('mwst'),       icon: Receipt },
    { href: '/dashboard/tax-year',     label: t('taxYear'),    icon: CalendarDays },
    { href: '/dashboard/documents',    label: t('documents'),  icon: FolderOpen },
    { href: '/dashboard/settings',     label: t('settings'),   icon: Settings },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-950 border-r border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
          <span className="text-sm font-bold text-black">L</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">LuxGo Finance</p>
          <p className="text-xs text-gray-500 leading-tight">Swiss Accounting</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-amber-400' : 'text-gray-500')} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
            {t('quickActions')}
          </p>
          <Link
            href="/dashboard/income?action=new"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <FileText className="h-4 w-4 text-gray-500" />
            {t('newInvoice')}
          </Link>
        </div>
      </nav>

      {/* Language switcher + Sign out */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {/* Language toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Lang</span>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setLocale('en')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                locale === 'en'
                  ? 'bg-amber-500 text-black'
                  : 'text-gray-400 hover:text-white'
              )}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => setLocale('de')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                locale === 'de'
                  ? 'bg-amber-500 text-black'
                  : 'text-gray-400 hover:text-white'
              )}
              title="Deutsch"
            >
              DE
            </button>
          </div>
        </div>

        {/* Sign out */}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-500" />
            {t('signOut')}
          </button>
        </form>
      </div>
    </aside>
  )
}

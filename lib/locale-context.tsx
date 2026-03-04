'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/messages/en.json'
import deMessages from '@/messages/de.json'

export type Locale = 'en' | 'de'

const STORAGE_KEY = 'luxgo-locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
})

export function useLocale() {
  return useContext(LocaleContext)
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Locale) || 'en'
    setLocaleState(saved)
    setMounted(true)
  }, [])

  function setLocale(l: Locale) {
    localStorage.setItem(STORAGE_KEY, l)
    setLocaleState(l)
  }

  const messages = locale === 'de' ? deMessages : enMessages

  // Avoid hydration mismatch: render with default until mounted
  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: 'en', setLocale }}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          {children}
        </NextIntlClientProvider>
      </LocaleContext.Provider>
    )
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}

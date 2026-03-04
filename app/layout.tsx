import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LuxGo Finance',
  description: 'Swiss Tax & Accounting for LuxGo GmbH',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#1f2937', border: '1px solid #374151', color: '#fff' },
          }}
        />
      </body>
    </html>
  )
}

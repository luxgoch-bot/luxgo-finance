import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      {/* ml-64 on desktop; on mobile the sidebar overlays and main takes full width */}
      <main className="flex-1 md:ml-64 overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Sidebar, MobileSidebar } from '@/features/dashboard/components/sidebar'
import { Header } from '@/features/dashboard/components/header'
import { PageHeaderProvider } from '@/features/dashboard/lib/page-header-context'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <PageHeaderProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main id="main-content" className="min-h-0 flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </PageHeaderProvider>
  )
}

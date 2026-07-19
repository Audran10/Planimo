'use client'

import { createContext, useContext, useState } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderContextValue {
  crumbs: BreadcrumbItem[] | null
  setCrumbs: (crumbs: BreadcrumbItem[] | null) => void
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null)

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[] | null>(null)

  return (
    <PageHeaderContext.Provider value={{ crumbs, setCrumbs }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider')
  }
  return context
}

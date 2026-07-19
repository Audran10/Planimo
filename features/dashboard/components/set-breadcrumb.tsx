'use client'

import { useEffect } from 'react'
import {
  usePageHeader,
  type BreadcrumbItem,
} from '@/features/dashboard/lib/page-header-context'

export function SetBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { setCrumbs } = usePageHeader()
  const key = items.map((item) => `${item.label}:${item.href ?? ''}`).join('|')

  useEffect(() => {
    setCrumbs(items)
    return () => setCrumbs(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs])

  return null
}

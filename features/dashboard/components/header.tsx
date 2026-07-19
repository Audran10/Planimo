'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { ThemeToggle } from '@/core/components/shared/theme-toggle'
import {
  usePageHeader,
  type BreadcrumbItem,
} from '@/features/dashboard/lib/page-header-context'

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  properties: 'Biens',
  tenants: 'Locataires',
  documents: 'Documents',
}

function useBreadcrumb(override: BreadcrumbItem[] | null): BreadcrumbItem[] {
  const pathname = usePathname()

  if (override) return override

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((segment) => ({
    label: pageTitles[segment] ?? segment,
  }))

  return crumbs.length > 0 ? crumbs : [{ label: 'Dashboard' }]
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { crumbs: override } = usePageHeader()

  const crumbs = useBreadcrumb(override)
  const title = crumbs[crumbs.length - 1]?.label ?? 'Dashboard'

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur transition-all duration-200 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                crumb.label
              )}
            </span>
          ))}
        </div>
        <h1 className="truncate text-sm font-semibold">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}

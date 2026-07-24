'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/core/components/ui/avatar'
import { Button } from '@/core/components/ui/button'
import { Separator } from '@/core/components/ui/separator'
import { Logo } from '@/core/components/shared/logo'
import { ThemeToggle } from '@/core/components/shared/theme-toggle'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet'
import { cn } from '@/core/lib/utils'
import { signOut, useSession } from '@/core/lib/auth-client'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Biens', href: '/properties', icon: Building2 },
  { label: 'Locataires', href: '/tenants', icon: Users },
  { label: 'Documents', href: '/documents', icon: FileText },
]

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      className="flex-1 space-y-1 overflow-y-auto px-3"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mt-auto shrink-0 space-y-2 p-2.5">
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
        <Avatar size="sm" className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {getInitials(session?.user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {session?.user?.name ?? '—'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session?.user?.email ?? ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start gap-1 cursor-pointer text-muted-foreground transition-all duration-200 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}

function SidebarBrand() {
  return (
    <div className="shrink-0 px-4 py-5">
      <Logo />
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen shadow-[1px_0_0_0_hsl(var(--border))] lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-hidden lg:bg-gray-50 dark:lg:bg-gray-950">
      <SidebarBrand />
      <SidebarNav />
      <Separator className="my-2 shrink-0" />
      <SidebarFooter />
    </aside>
  )
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-60 flex-col bg-gray-50 p-0 dark:bg-gray-950"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarBrand />
        <SidebarNav />
        <Separator className="my-2" />
        <SidebarFooter />
      </SheetContent>
    </Sheet>
  )
}

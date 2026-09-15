import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  FileText,
  Home,
  Inbox,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import { getProperties } from '@/features/properties/actions/properties'
import { getAllTenants } from '@/features/tenants/actions/tenants'
import { isTenantActive } from '@/features/tenants/lib/tenant-status'
import { getAllDocuments } from '@/features/documents/actions/documents'

interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  hint?: string
  href?: string
  borderColor: string
  iconBg: string
  iconColor: string
}

function StatCard(stat: StatItem) {
  const content = (
    <Card
      className={
        `h-full border border-border border-l-4 ${stat.borderColor} shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-md` +
        (stat.href ? ' cursor-pointer' : '')
      }
    >
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} aria-hidden="true" />
          </div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {stat.label}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{stat.value}</p>
        {stat.href && stat.hint ? (
          <p className="mt-2 min-h-4 truncate text-xs text-primary hover:underline">
            + {stat.hint}
          </p>
        ) : (
          <p className="mt-2 min-h-4 truncate text-xs text-muted-foreground">
            {stat.hint ?? '\u00a0'}
          </p>
        )}
      </CardContent>
    </Card>
  )

  return stat.href ? (
    <Link href={stat.href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect('/login')

  const properties = await getProperties()
  const unitsCount = properties.reduce((sum, p) => sum + p.unitsCount, 0)

  const tenants = await getAllTenants()
  const activeTenantsCount = tenants.filter(isTenantActive).length

  const documents = await getAllDocuments()

  const stats: StatItem[] = [
    {
      label: 'Biens',
      value: properties.length,
      icon: Building2,
      hint: 'Ajouter un bien',
      href: '/properties',
      borderColor: 'border-l-indigo-500',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Appartements',
      value: unitsCount,
      icon: Home,
      hint: 'Aucun appartement pour le moment',
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Locataires',
      value: activeTenantsCount,
      icon: Users,
      href: '/tenants',
      borderColor: 'border-l-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Documents',
      value: documents.length,
      icon: FileText,
      href: '/documents',
      borderColor: 'border-l-violet-500',
      iconBg: 'bg-violet-50 dark:bg-violet-950',
      iconColor: 'text-violet-600',
    },
  ]

  const firstName = session.user.name.split(' ')[0]
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {firstName}</h1>
          <p className="mt-1 text-muted-foreground">
            Voici un aperçu de votre patrimoine.
          </p>
        </div>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card className="border border-border">
        <CardHeader>
          <p className="text-sm font-medium">Activité récente</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Aucune activité pour le moment
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

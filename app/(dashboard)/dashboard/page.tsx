import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  FileText,
  FileUp,
  Home,
  Inbox,
  Plus,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import { Button } from '@/core/components/ui/button'
import { getProperties } from '@/features/properties/actions/properties'

const quickActions = [
  { label: 'Ajouter un bien', icon: Plus, href: '/properties' },
  { label: 'Ajouter un locataire', icon: UserPlus, href: '/tenants' },
  { label: 'Importer un document', icon: FileUp, href: '/documents' },
]

interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  hint: string
  href?: string
}

function StatCard(stat: StatItem) {
  const content = (
    <Card
      className={
        'border border-border transition-all duration-200 hover:shadow-md' +
        (stat.href ? ' cursor-pointer' : '')
      }
    >
      <CardHeader className="flex-row items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {stat.label}
        </p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <stat.icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
        {stat.href ? (
          <p className="mt-2 text-xs text-primary hover:underline">
            + {stat.hint}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
        )}
      </CardContent>
    </Card>
  )

  return stat.href ? <Link href={stat.href}>{content}</Link> : content
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect('/login')

  const properties = await getProperties()
  const unitsCount = properties.reduce((sum, p) => sum + p.unitsCount, 0)

  const stats: StatItem[] = [
    {
      label: 'Biens',
      value: properties.length,
      icon: Building2,
      hint: 'Ajouter un bien',
      href: '/properties',
    },
    {
      label: 'Appartements',
      value: unitsCount,
      icon: Home,
      hint: 'Aucun appartement pour le moment',
    },
    {
      label: 'Locataires',
      value: 0,
      icon: Users,
      hint: 'Ajouter un locataire',
      href: '/tenants',
    },
    {
      label: 'Documents',
      value: 0,
      icon: FileText,
      hint: 'Importer un document',
      href: '/documents',
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border border-border lg:col-span-2">
          <CardHeader>
            <p className="text-sm font-medium">Activité récente</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucune activité pour le moment
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <p className="text-sm font-medium">Accès rapides</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                nativeButton={false}
                render={<Link href={action.href} />}
                className="w-full cursor-pointer justify-start gap-2 border border-border transition-all duration-200"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

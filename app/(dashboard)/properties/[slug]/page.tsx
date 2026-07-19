import { notFound } from 'next/navigation'
import { DoorOpen, MapPin } from 'lucide-react'
import { getPropertyBySlug } from '@/features/properties/actions/properties'
import { PropertyDetailActions } from '@/features/properties/components/property-detail-actions'
import { propertyTypeIcons, propertyTypeLabels } from '@/features/properties/constants'
import { getOrCreateHouseUnit, getUnitsByPropertyId } from '@/features/units/actions/units'
import { UnitCard } from '@/features/units/components/unit-card'
import { UnitSections } from '@/features/units/components/unit-sections'
import { AddUnitButton } from '@/features/units/components/add-unit-button'
import { InviteMemberButton } from '@/features/members/components/invite-member-button'
import { RemoveMemberButton } from '@/features/members/components/remove-member-button'
import { SetBreadcrumb } from '@/features/dashboard/components/set-breadcrumb'
import { getUnitLabel } from '@/core/lib/property-labels'
import { Badge } from '@/core/components/ui/badge'
import { Card, CardContent } from '@/core/components/ui/card'
import { Avatar, AvatarFallback } from '@/core/components/ui/avatar'
import type { PropertyRole } from '@/features/properties/types'

const roleLabels: Record<PropertyRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecteur',
}

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

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let property
  try {
    property = await getPropertyBySlug(slug)
  } catch {
    notFound()
  }

  if (!property) notFound()

  const isHouse = property.type === 'house'
  const houseUnit = isHouse
    ? await getOrCreateHouseUnit(property.id, property.name)
    : null
  const units = isHouse ? [] : await getUnitsByPropertyId(property.id)

  const Icon = propertyTypeIcons[property.type]
  const canManageMembers = property.role === 'owner' || property.role === 'admin'
  const unitLabelPlural = getUnitLabel(property.type, true)

  return (
    <div className="space-y-8">
      <SetBreadcrumb
        items={[{ label: 'Biens', href: '/properties' }, { label: property.name }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{property.name}</h1>
              <Badge variant={property.role === 'owner' ? 'default' : 'outline'}>
                {roleLabels[property.role]}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.address}
            </p>
            <Badge variant="secondary" className="mt-2">
              {propertyTypeLabels[property.type]}
            </Badge>
          </div>
        </div>

        <PropertyDetailActions property={property} />
      </div>

      {property.description && (
        <p className="text-sm text-muted-foreground">{property.description}</p>
      )}

      {isHouse ? (
        houseUnit && <UnitSections unit={houseUnit} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{unitLabelPlural}</h2>
            <AddUnitButton
              propertyId={property.id}
              propertySlug={property.slug}
              propertyType={property.type}
            />
          </div>

          {units.length === 0 ? (
            <Card className="border border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <DoorOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucun {getUnitLabel(property.type).toLowerCase()} pour le moment
                </p>
                <AddUnitButton
                  propertyId={property.id}
                  propertySlug={property.slug}
                  propertyType={property.type}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  propertySlug={property.slug}
                  propertyRole={property.role}
                  propertyType={property.type}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Membres</h2>
          {canManageMembers && <InviteMemberButton propertyId={property.id} />}
        </div>

        <Card className="border border-border">
          <CardContent className="divide-y divide-border p-0">
            <div className="flex items-center gap-3 p-4">
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/10 font-medium text-primary">
                  {getInitials(property.owner.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {property.owner.name ?? property.owner.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {property.owner.email}
                </p>
              </div>
              <Badge variant="default">Propriétaire</Badge>
            </div>

            {property.members.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucun autre membre pour le moment
              </p>
            ) : (
              property.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-4">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 font-medium text-primary">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  {!member.acceptedAt && (
                    <Badge variant="outline">En attente</Badge>
                  )}
                  <Badge variant="secondary">{roleLabels[member.role]}</Badge>
                  {canManageMembers && (
                    <RemoveMemberButton
                      propertyId={property.id}
                      userId={member.userId}
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

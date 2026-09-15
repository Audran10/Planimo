import type { MemberRole } from '@/core/types'
import type { PropertyRole } from '@/features/properties/types'

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecteur',
}

export const PROPERTY_ROLE_LABELS: Record<PropertyRole, string> = {
  owner: 'Propriétaire',
  ...MEMBER_ROLE_LABELS,
}

export const MEMBER_ROLE_OPTIONS: {
  value: MemberRole
  label: string
  description: string
}[] = [
  {
    value: 'admin',
    label: 'Administrateur',
    description:
      'Peut modifier le bien, supprimer des appartements, et gérer les membres',
  },
  {
    value: 'editor',
    label: 'Éditeur',
    description:
      'Peut ajouter et modifier appartements, locataires, documents, plans et interventions',
  },
  {
    value: 'viewer',
    label: 'Lecteur',
    description: 'Peut consulter uniquement',
  },
]

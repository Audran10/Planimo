'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/core/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import { updateMemberRole } from '@/features/members/actions/members'
import { MEMBER_ROLE_LABELS, MEMBER_ROLE_OPTIONS } from '@/features/members/constants'
import { canAssignMemberRole } from '@/features/members/lib/permissions'
import type { MemberRole } from '@/core/types'
import type { PropertyRole } from '@/features/properties/types'

export function MemberRoleSelect({
  propertyId,
  userId,
  currentRole,
  actorRole,
}: {
  propertyId: string
  userId: string
  currentRole: MemberRole
  actorRole: PropertyRole
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const options = MEMBER_ROLE_OPTIONS.filter(
    (option) =>
      option.value === currentRole ||
      canAssignMemberRole(actorRole, currentRole, option.value)
  )
  const canChange = options.some((option) => option.value !== currentRole)

  if (!canChange) {
    return <Badge variant="secondary">{MEMBER_ROLE_LABELS[currentRole]}</Badge>
  }

  async function handleChange(value: string | null) {
    if (!value || value === currentRole) return
    setSaving(true)
    try {
      await updateMemberRole(propertyId, userId, value as MemberRole)
      toast.success('Rôle mis à jour')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select
      value={currentRole}
      onValueChange={handleChange}
      items={options}
      disabled={saving}
    >
      <SelectTrigger
        size="sm"
        aria-label="Modifier le rôle"
        className="cursor-pointer"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

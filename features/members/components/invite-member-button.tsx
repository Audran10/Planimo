'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { InviteDialog } from '@/features/members/components/invite-dialog'
import type { PropertyRole } from '@/features/properties/types'

export function InviteMemberButton({
  propertyId,
  actorRole,
}: {
  propertyId: string
  actorRole: PropertyRole
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer gap-2"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Inviter
      </Button>
      <InviteDialog
        propertyId={propertyId}
        actorRole={actorRole}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

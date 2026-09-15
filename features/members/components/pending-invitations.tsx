'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { Badge } from '@/core/components/ui/badge'
import {
  acceptInvitation,
  declineInvitation,
} from '@/features/members/actions/members'
import type { PendingInvitation } from '@/features/members/types'
import { MEMBER_ROLE_LABELS } from '@/features/members/constants'

export function PendingInvitations({
  invitations,
}: {
  invitations: PendingInvitation[]
}) {
  if (invitations.length === 0) return null

  return (
    <section
      aria-label="Invitations en attente"
      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">
          Invitation{invitations.length > 1 ? 's' : ''} en attente
        </h2>
      </div>
      <ul className="space-y-3">
        {invitations.map((invitation) => (
          <PendingInvitationRow key={invitation.propertyId} invitation={invitation} />
        ))}
      </ul>
    </section>
  )
}

function PendingInvitationRow({ invitation }: { invitation: PendingInvitation }) {
  const router = useRouter()
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null)

  async function handleAccept() {
    setPending('accept')
    try {
      await acceptInvitation(invitation.propertyId)
      toast.success(`Vous avez rejoint ${invitation.propertyName}`)
      router.push(`/properties/${invitation.propertySlug}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'invitation n'a pas pu être acceptée")
      setPending(null)
    }
  }

  async function handleDecline() {
    setPending('decline')
    try {
      await declineInvitation(invitation.propertyId)
      toast.success('Invitation refusée')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'invitation n'a pas pu être refusée")
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <li className="flex flex-col gap-3 rounded-lg bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{invitation.propertyName}</p>
        <p className="truncate text-sm text-muted-foreground">{invitation.propertyAddress}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invité par {invitation.invitedBy} ·{' '}
          <Badge variant="secondary">{MEMBER_ROLE_LABELS[invitation.role]}</Badge>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={busy}
          onClick={handleDecline}
        >
          {pending === 'decline' && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Refuser
        </Button>
        <Button size="sm" className="cursor-pointer" disabled={busy} onClick={handleAccept}>
          {pending === 'accept' && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Accepter
        </Button>
      </div>
    </li>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import { inviteMember } from '@/features/members/actions/members'
import {
  inviteMemberSchema,
  type InviteMemberFormValues,
} from '@/features/members/schemas/invite-member.schema'

const roleOptions: {
  value: InviteMemberFormValues['role']
  label: string
  description: string
}[] = [
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Peut modifier le bien et inviter des membres',
  },
  {
    value: 'editor',
    label: 'Éditeur',
    description: 'Peut ajouter et modifier les données',
  },
  {
    value: 'viewer',
    label: 'Lecteur',
    description: 'Peut consulter uniquement',
  },
]

interface InviteDialogProps {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ propertyId, open, onOpenChange }: InviteDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ email: '', role: 'viewer' })
    }
  }, [open, form])

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const selectedRoleOption = roleOptions.find((r) => r.value === selectedRole)

  async function onSubmit(values: InviteMemberFormValues) {
    setLoading(true)
    try {
      await inviteMember(propertyId, values.email, values.role)
      toast.success('Invitation envoyée')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            Invitez une personne à collaborer sur ce bien.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="marc@example.com"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={roleOptions}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRoleOption && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRoleOption.description}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Inviter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

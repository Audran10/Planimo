'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { createTenant, updateTenant } from '@/features/tenants/actions/tenants'
import {
  tenantSchema,
  type TenantFormValues,
} from '@/features/tenants/schemas/tenant.schema'
import type { Tenant } from '@/features/tenants/types'
import type { z } from 'zod'
import { FileUpload } from '@/core/components/shared/file-upload'
import { createDocument, uploadDocumentFile } from '@/features/documents/actions/documents'
import { buildDocumentFilename } from '@/features/documents/lib/build-filename'
import { useSession } from '@/core/lib/auth-client'

type TenantSummary = Pick<
  Tenant,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'leaseStart'
  | 'leaseEnd'
  | 'monthlyRent'
  | 'deposit'
>

// z.coerce.date() has an input type of `unknown`, distinct from its parsed
// `Date` output. useForm needs both generics so the resolver (which speaks
// in input types) and the rest of the form (which speaks in output types,
// e.g. onSubmit) type-check against the right shape.
type TenantFormInput = z.input<typeof tenantSchema>

function toDateInputValue(date?: Date | null) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function defaultValuesFor(tenant?: TenantSummary): TenantFormInput {
  return {
    fullName: tenant?.fullName ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    leaseStart: tenant?.leaseStart ?? new Date(),
    leaseEnd: tenant?.leaseEnd ?? undefined,
    monthlyRent: tenant?.monthlyRent as number,
    deposit: tenant?.deposit ?? undefined,
  }
}

interface TenantFormDialogProps {
  mode: 'create' | 'edit'
  unitId: string
  propertySlug: string
  unitSlug: string
  tenant?: TenantSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TenantFormDialog({
  mode,
  unitId,
  propertySlug,
  unitSlug,
  tenant,
  open,
  onOpenChange,
}: TenantFormDialogProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  // Only read at submit time (never rendered), so a ref avoids an extra
  // setState call inside the reset-on-open effect below.
  const leaseFileRef = useRef<File | null>(null)

  const form = useForm<TenantFormInput, unknown, TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: defaultValuesFor(tenant),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValuesFor(tenant))
      leaseFileRef.current = null
    }
  }, [open, tenant, form])

  // Clear the error banner on close (an event, not a render-time sync) so a
  // stale error never reappears the next time the dialog is opened.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: TenantFormValues) {
    setLoading(true)
    setServerError(null)
    try {
      if (mode === 'edit' && tenant) {
        await updateTenant(tenant.id, values)
        toast.success('Locataire mis à jour')
      } else {
        const created = await createTenant(unitId, values)
        const leaseFile = leaseFileRef.current

        if (leaseFile) {
          if (!session?.user) {
            toast.error(
              'Locataire créé, mais le bail n\'a pas pu être uploadé (session expirée).'
            )
          } else {
            try {
              const path = `${session.user.id}/${propertySlug}/${unitSlug}/lease/${buildDocumentFilename(leaseFile.name)}`
              const formData = new FormData()
              formData.append('file', leaseFile)
              formData.append('bucket', 'documents')
              formData.append('path', path)
              const uploaded = await uploadDocumentFile(formData)

              await createDocument({
                name: `Bail - ${created.fullName}`,
                type: 'lease',
                unitId,
                tenantId: created.id,
                fileUrl: uploaded.url,
                fileType: uploaded.fileType,
                fileSize: uploaded.fileSize,
              })
            } catch (uploadError) {
              toast.error(
                uploadError instanceof Error
                  ? `Locataire créé, mais le bail n'a pas pu être uploadé : ${uploadError.message}`
                  : "Locataire créé, mais le bail n'a pas pu être uploadé."
              )
            }
          }
        }

        toast.success('Locataire ajouté avec succès')
      }
      handleOpenChange(false)
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Une erreur est survenue'
      setServerError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Modifier le locataire' : 'Ajouter un locataire'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Mettez à jour les informations de ce locataire.'
              : 'Renseignez les informations du bail.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event)
            }}
            noValidate
            className="space-y-4"
          >
            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3"
              >
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Marc Bernard"
                      disabled={loading}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="06 12 34 56 78"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leaseStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début du bail</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={loading}
                        aria-required="true"
                        value={toDateInputValue(field.value as Date)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leaseEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin du bail</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={loading}
                        value={toDateInputValue(field.value as Date | undefined)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyRent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loyer mensuel (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="850"
                        disabled={loading}
                        aria-required="true"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.valueAsNumber
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dépôt de garantie (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="850"
                        disabled={loading}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.valueAsNumber
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'create' && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Contrat de bail (optionnel)</p>
                <FileUpload
                  accept="application/pdf"
                  label="Glissez le bail (PDF) ou cliquez pour parcourir"
                  onFileSelect={(selected) => {
                    leaseFileRef.current = selected
                  }}
                  disabled={loading}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

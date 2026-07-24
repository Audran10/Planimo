'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Textarea } from '@/core/components/ui/textarea'
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
import { createWorkOrder, updateWorkOrder } from '@/features/work-orders/actions/work-orders'
import {
  workOrderSchema,
  type WorkOrderFormValues,
} from '@/features/work-orders/schemas/work-order.schema'
import type { WorkOrder } from '@/features/work-orders/types'
import type { z } from 'zod'

// z.coerce.date() has an input type of `unknown`, distinct from its parsed
// `Date` output. useForm needs both generics so the resolver (which speaks
// in input types) and the rest of the form (which speaks in output types,
// e.g. onSubmit) type-check against the right shape.
type WorkOrderInput = z.input<typeof workOrderSchema>

const statusOptions: { value: WorkOrderFormValues['status']; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
]

function toDateInputValue(date?: Date | null) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function defaultValuesFor(
  workOrder?: WorkOrder,
  unitId?: string,
  roomId?: string
): WorkOrderInput {
  return {
    description: workOrder?.description ?? '',
    contractor: workOrder?.contractor ?? '',
    amount: workOrder?.amount ?? undefined,
    interventionDate: workOrder?.interventionDate ?? undefined,
    status: workOrder?.status ?? 'pending',
    unitId: workOrder?.unitId ?? unitId,
    roomId: workOrder?.roomId ?? roomId,
  }
}

interface WorkOrderFormDialogProps {
  mode: 'create' | 'edit'
  unitId?: string
  roomId?: string
  workOrder?: WorkOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function WorkOrderFormDialog({
  mode,
  unitId,
  roomId,
  workOrder,
  open,
  onOpenChange,
  onSuccess,
}: WorkOrderFormDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<WorkOrderInput, unknown, WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: defaultValuesFor(workOrder, unitId, roomId),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValuesFor(workOrder, unitId, roomId))
    }
  }, [open, workOrder, unitId, roomId, form])

  // Clear the error banner on close (an event, not a render-time sync) so a
  // stale error never reappears the next time the dialog is opened.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: WorkOrderFormValues) {
    setLoading(true)
    setServerError(null)
    try {
      if (mode === 'edit' && workOrder) {
        await updateWorkOrder(workOrder.id, values)
        toast.success('Intervention mise à jour')
      } else {
        await createWorkOrder(values)
        toast.success('Intervention ajoutée avec succès')
      }
      handleOpenChange(false)
      onSuccess?.()
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
            {mode === 'edit' ? "Modifier l'intervention" : 'Ajouter une intervention'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Mettez à jour les informations de cette intervention.'
              : "Renseignez les informations de l'intervention."}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Réparation de la chaudière"
                      disabled={loading}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={field.value ?? 'pending'}
                    onValueChange={field.onChange}
                    items={statusOptions}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true" className="w-full">
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artisan / Entreprise</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Plomberie Dupont"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="250"
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

              <FormField
                control={form.control}
                name="interventionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d&apos;intervention</FormLabel>
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

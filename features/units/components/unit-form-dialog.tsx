'use client'

import { useEffect, useState } from 'react'
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
import { createUnit, updateUnit } from '@/features/units/actions/units'
import {
  unitSchema,
  type UnitFormValues,
} from '@/features/units/schemas/unit.schema'
import type { Unit } from '@/features/units/types'
import { getUnitLabel } from '@/core/lib/property-labels'
import type { PropertyType } from '@/core/types'

const definiteLabel: Record<string, string> = {
  apartment_building: "l'appartement",
  commercial: 'le local',
}

const indefiniteLabel: Record<string, string> = {
  apartment_building: 'un appartement',
  commercial: 'un local',
}

interface UnitFormDialogProps {
  mode: 'create' | 'edit'
  propertyId: string
  propertySlug: string
  propertyType: PropertyType
  unit?: Pick<Unit, 'id' | 'name' | 'floor' | 'surface'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnitFormDialog({
  mode,
  propertyId,
  propertySlug,
  propertyType,
  unit,
  open,
  onOpenChange,
}: UnitFormDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const unitLabel = getUnitLabel(propertyType)
  const definite = definiteLabel[propertyType] ?? `l'${unitLabel.toLowerCase()}`
  const indefinite = indefiniteLabel[propertyType] ?? `une ${unitLabel.toLowerCase()}`

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: unit?.name ?? '',
      floor: unit?.floor ?? undefined,
      surface: unit?.surface ?? undefined,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: unit?.name ?? '',
        floor: unit?.floor ?? undefined,
        surface: unit?.surface ?? undefined,
      })
    }
  }, [open, unit, form])

  async function onSubmit(values: UnitFormValues) {
    setLoading(true)
    try {
      const result =
        mode === 'edit' && unit
          ? await updateUnit(unit.id, values)
          : await createUnit(propertyId, values)

      toast.success(
        mode === 'edit' ? `${unitLabel} mis à jour` : `${unitLabel} créé avec succès`
      )
      onOpenChange(false)
      router.push(`/properties/${propertySlug}/units/${result.slug}`)
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
          <DialogTitle>
            {mode === 'edit' ? `Modifier ${definite}` : `Ajouter ${indefinite}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Mettez à jour les informations de ${definite}.`
              : `Ajoutez ${indefinite} à ce bien.`}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`${unitLabel} 1A`}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Étage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surface"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="45"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'edit' ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

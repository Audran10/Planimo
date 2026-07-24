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
import { createProperty, updateProperty } from '@/features/properties/actions/properties'
import {
  propertySchema,
  type PropertyFormValues,
} from '@/features/properties/schemas/property.schema'
import type { Property } from '@/features/properties/types'
import { propertyTypeLabels } from '@/features/properties/constants'

const typeOptions: { value: PropertyFormValues['type']; label: string }[] = (
  Object.entries(propertyTypeLabels) as [PropertyFormValues['type'], string][]
).map(([value, label]) => ({ value, label }))

interface PropertyFormDialogProps {
  mode: 'create' | 'edit'
  property?: Pick<Property, 'id' | 'name' | 'address' | 'type' | 'description'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PropertyFormDialog({
  mode,
  property,
  open,
  onOpenChange,
}: PropertyFormDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property?.name ?? '',
      address: property?.address ?? '',
      type: property?.type ?? 'apartment_building',
      description: property?.description ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: property?.name ?? '',
        address: property?.address ?? '',
        type: property?.type ?? 'apartment_building',
        description: property?.description ?? '',
      })
    }
  }, [open, property, form])

  async function onSubmit(values: PropertyFormValues) {
    setLoading(true)
    try {
      const result =
        mode === 'edit' && property
          ? await updateProperty(property.id, values)
          : await createProperty(values)

      toast.success(mode === 'edit' ? 'Bien mis à jour' : 'Bien créé avec succès')
      onOpenChange(false)
      router.push(`/properties/${result.slug}`)
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
            {mode === 'edit' ? 'Modifier le bien' : 'Nouveau bien'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Mettez à jour les informations de ce bien.'
              : 'Ajoutez un nouveau bien à votre patrimoine.'}
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
                      placeholder="Résidence des Lilas"
                      disabled={loading}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12 rue des Lilas, 75011 Paris"
                      disabled={loading}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de bien</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={typeOptions}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true" className="w-full">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Quelques précisions sur ce bien..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
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
                {mode === 'edit' ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

import * as z from 'zod'

export const propertySchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Le nom doit contenir au moins 2 caractères.' }),
  address: z
    .string()
    .min(5, { error: "L'adresse doit contenir au moins 5 caractères." }),
  type: z.enum(['apartment_building', 'house', 'commercial'], {
    error: 'Veuillez sélectionner un type de bien.',
  }),
  description: z.string().optional(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>

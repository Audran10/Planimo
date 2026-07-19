import * as z from 'zod'

export const unitSchema = z.object({
  name: z.string().min(1, { error: 'Le nom est requis.' }),
  floor: z.number().optional(),
  surface: z
    .number()
    .min(1, { error: 'La surface doit être supérieure à 0.' })
    .optional(),
})

export type UnitFormValues = z.infer<typeof unitSchema>

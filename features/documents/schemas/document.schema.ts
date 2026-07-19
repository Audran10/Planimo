import * as z from 'zod'

export const documentSchema = z
  .object({
    name: z.string().min(1, { error: 'Le nom est requis.' }),
    type: z.enum(
      ['lease', 'inventory', 'invoice', 'insurance', 'diagnostic', 'other'],
      { error: 'Veuillez sélectionner un type de document.' }
    ),
    unitId: z.string().optional(),
    roomId: z.string().optional(),
    tenantId: z.string().optional(),
  })
  .refine((data) => Boolean(data.unitId || data.roomId || data.tenantId), {
    error: 'Un document doit être rattaché à un appartement, une pièce ou un locataire.',
    path: ['unitId'],
  })

export type DocumentFormValues = z.infer<typeof documentSchema>

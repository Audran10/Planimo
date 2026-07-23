import * as z from 'zod'

export const workOrderSchema = z.object({
  description: z
    .string()
    .min(5, { error: 'La description doit contenir au moins 5 caractères.' }),
  contractor: z.string().optional(),
  amount: z
    .number()
    .positive({ error: 'Le montant doit être un nombre positif.' })
    .optional(),
  interventionDate: z.coerce.date().optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed'], {
      error: 'Veuillez sélectionner un statut.',
    })
    .default('pending'),
  unitId: z.string().optional(),
  roomId: z.string().optional(),
})

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>

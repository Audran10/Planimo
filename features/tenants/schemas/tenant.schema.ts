import * as z from 'zod'

const NAME_REGEX = /^[\p{L}\s'-]+$/u
const PHONE_REGEX =
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,4}[-\s.]?[0-9]{3,5}$/

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export const tenantSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { error: 'Le nom doit contenir au moins 2 caractères.' })
      .max(100, { error: 'Le nom ne peut pas dépasser 100 caractères.' })
      .regex(NAME_REGEX, {
        error: 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes.',
      }),
    email: z
      .email({ error: 'Veuillez entrer une adresse email valide.' })
      .optional(),
    phone: z
      .string()
      .optional()
      .refine((value) => !value || PHONE_REGEX.test(value), {
        error: 'Veuillez entrer un numéro de téléphone valide.',
      }),
    leaseStart: z
      .coerce.date({ error: 'Veuillez entrer une date de début de bail valide.' })
      .refine((date) => date.getTime() <= Date.now() + ONE_YEAR_MS, {
        error: "La date de début de bail ne peut pas être dans plus d'un an.",
      }),
    leaseEnd: z.coerce.date().optional(),
    monthlyRent: z
      .number()
      .positive({ error: 'Le loyer mensuel doit être un nombre positif.' })
      .max(50000, { error: 'Le loyer mensuel ne peut pas dépasser 50 000 €.' }),
    deposit: z
      .number()
      .positive({ error: 'Le dépôt doit être un nombre positif.' })
      .max(100000, { error: 'Le dépôt ne peut pas dépasser 100 000 €.' })
      .optional(),
  })
  .refine((data) => !data.leaseEnd || data.leaseEnd > data.leaseStart, {
    error: 'La date de fin de bail doit être postérieure à la date de début.',
    path: ['leaseEnd'],
  })

export type TenantFormValues = z.infer<typeof tenantSchema>

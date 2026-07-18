import * as z from 'zod'

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Le nom doit contenir au moins 2 caractères.' }),
  email: z.email({ error: 'Veuillez entrer une adresse email valide.' }),
  password: z
    .string()
    .min(8, { error: 'Le mot de passe doit contenir au moins 8 caractères.' }),
})

export type RegisterFormValues = z.infer<typeof registerSchema>

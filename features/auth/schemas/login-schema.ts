import * as z from 'zod'

export const loginSchema = z.object({
  email: z.email({ error: 'Veuillez entrer une adresse email valide.' }),
  password: z
    .string()
    .min(1, { error: 'Le mot de passe est requis.' }),
})

export type LoginFormValues = z.infer<typeof loginSchema>

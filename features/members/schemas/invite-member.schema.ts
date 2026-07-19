import * as z from 'zod'

export const inviteMemberSchema = z.object({
  email: z.email({ error: 'Veuillez entrer une adresse email valide.' }),
  role: z.enum(['admin', 'editor', 'viewer'], {
    error: 'Veuillez sélectionner un rôle.',
  }),
})

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>

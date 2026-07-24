import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Capture les erreurs de rendu côté serveur (Server Components, Route
// Handlers, Server Actions) — sans ça, seules les erreurs explicitement
// levées côté client seraient remontées à Sentry.
export const onRequestError = Sentry.captureRequestError

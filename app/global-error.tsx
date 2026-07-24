'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/core/components/ui/button'
// global-error replaces the root layout entirely when it triggers, so it
// doesn't inherit globals.css (Tailwind base styles, CSS variables) unless
// imported here directly.
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center flex-col gap-4">
          <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
          <p className="text-muted-foreground text-sm">
            L&apos;erreur a été signalée automatiquement.
          </p>
          <Button onClick={reset}>Réessayer</Button>
        </div>
      </body>
    </html>
  )
}

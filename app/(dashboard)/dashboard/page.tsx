import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect('/login')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        Bonjour, {session.user.name}
      </h1>
      <p className="text-muted-foreground mt-2">
        Dashboard en construction...
      </p>
    </div>
  )
}

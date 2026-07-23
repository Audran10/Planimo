import { Users } from 'lucide-react'
import { getAllTenants } from '@/features/tenants/actions/tenants'
import { TenantsTable } from '@/features/tenants/components/tenants-table'
import { Card, CardContent } from '@/core/components/ui/card'

export default async function TenantsPage() {
  const tenants = await getAllTenants()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Locataires</h1>
        <p className="mt-1 text-muted-foreground">
          Retrouvez l&apos;ensemble des locataires de votre patrimoine.
        </p>
      </div>

      {tenants.length === 0 ? (
        <Card className="border border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Aucun locataire pour le moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border">
          <CardContent className="p-0">
            <TenantsTable tenants={tenants} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

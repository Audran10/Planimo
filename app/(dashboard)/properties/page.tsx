import { Building2 } from 'lucide-react'
import { getProperties } from '@/features/properties/actions/properties'
import { PropertyList } from '@/features/properties/components/property-list'
import { NewPropertyButton } from '@/features/properties/components/new-property-button'

export default async function PropertiesPage() {
  const properties = await getProperties()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Biens</h1>
          <p className="mt-1 text-muted-foreground">
            Gérez votre patrimoine immobilier.
          </p>
        </div>
        {properties.length > 0 && <NewPropertyButton />}
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">Aucun bien pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Ajoutez votre premier bien pour commencer à gérer votre
              patrimoine.
            </p>
          </div>
          <NewPropertyButton label="Ajouter votre premier bien" />
        </div>
      ) : (
        <PropertyList properties={properties} />
      )}
    </div>
  )
}

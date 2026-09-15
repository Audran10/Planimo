'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { CardContent, CardHeader } from '@/core/components/ui/card'
import { addFloorPlan } from '@/features/units/actions/floor-plan'
import { FloorPlanUpload } from '@/features/units/components/floor-plan-upload'
import { FloorPlanViewer } from '@/features/units/components/floor-plan-viewer'
import { listFloorPlans } from '@/features/units/lib/floor-plans'
import { getFloorPlanLabel } from '@/core/lib/property-labels'
import { cn } from '@/core/lib/utils'
import type { RoomWithMeta, UnitDetail } from '@/features/units/types'

export function FloorPlansSection({
  unit,
  rooms,
  canWrite,
}: {
  unit: UnitDetail
  rooms: RoomWithMeta[]
  canWrite: boolean
}) {
  const router = useRouter()
  const isHouse = unit.property.type === 'house'
  const plans = listFloorPlans(unit)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const activeId =
    selectedId && plans.some((plan) => plan.id === selectedId)
      ? selectedId
      : (plans[0]?.id ?? '')
  const active = plans.find((plan) => plan.id === activeId) ?? plans[0]
  const title = getFloorPlanLabel(unit.property.type, plans.length > 1)

  async function handleAddFloor() {
    setAdding(true)
    try {
      const created = await addFloorPlan(unit.id)
      setSelectedId(created.id)
      toast.success(`${created.name} ajouté`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'ajouter un étage"
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {isHouse && canWrite && (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => void handleAddFloor()}
            disabled={adding}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un étage
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Étages">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={plan.id === active?.id}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  plan.id === active?.id
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setSelectedId(plan.id)}
              >
                {plan.name}
              </button>
            ))}
          </div>
        )}

        {!active?.url ? (
          canWrite ? (
            <FloorPlanUpload unitId={unit.id} planId={active?.id} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun plan pour le moment
            </p>
          )
        ) : (
          <FloorPlanViewer
            key={active.id}
            unit={{
              ...unit,
              floorPlanUrl: active.url,
              floorPlanZones: active.zones,
              floorPlanCells: active.cells,
            }}
            zones={active.zones}
            rooms={rooms.filter((room) =>
              active.zones.some((zone) => zone.id === room.slug)
            )}
            planId={active.id}
          />
        )}
      </CardContent>
    </>
  )
}

import { Wrench } from 'lucide-react'
import { WorkOrderCard } from '@/features/work-orders/components/work-order-card'
import type { WorkOrder } from '@/features/work-orders/types'

const amountFormatter = new Intl.NumberFormat('fr-FR')

export function WorkOrderList({ workOrders }: { workOrders: WorkOrder[] }) {
  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Wrench className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Aucune intervention pour le moment
        </p>
      </div>
    )
  }

  const total = workOrders
    .filter((workOrder) => workOrder.status === 'completed')
    .reduce((sum, workOrder) => sum + (workOrder.amount ?? 0), 0)

  return (
    <div className="space-y-3">
      {workOrders.map((workOrder) => (
        <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
      ))}
      <p className="border-t border-border pt-3 text-right text-sm font-medium">
        Total travaux : {amountFormatter.format(total)} €
      </p>
    </div>
  )
}

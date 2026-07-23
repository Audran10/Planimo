'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Pencil, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet'
import { Input } from '@/core/components/ui/input'
import { Textarea } from '@/core/components/ui/textarea'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/ui/tabs'
import { useDebounce } from '@/core/hooks/use-debounce'
import { getDocumentsByRoomId } from '@/features/documents/actions/documents'
import { DocumentList } from '@/features/documents/components/document-list'
import { AddDocumentButton } from '@/features/documents/components/add-document-button'
import { getWorkOrdersByUnitId } from '@/features/work-orders/actions/work-orders'
import { WorkOrderCard } from '@/features/work-orders/components/work-order-card'
import { AddWorkOrderButton } from '@/features/work-orders/components/add-work-order-button'
import { updateRoom } from '@/features/units/actions/rooms'
import type { Document } from '@/features/documents/types'
import type { WorkOrder } from '@/features/work-orders/types'
import type { RoomWithMeta } from '@/features/units/types'

interface RoomDetailPanelProps {
  room: RoomWithMeta
  unitId: string
  propertySlug: string
  unitSlug: string
  open: boolean
  onClose: () => void
}

export function RoomDetailPanel({
  room,
  unitId,
  propertySlug,
  unitSlug,
  open,
  onClose,
}: RoomDetailPanelProps) {
  const router = useRouter()

  const [documents, setDocuments] = useState<Document[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(room.name)
  const [renaming, setRenaming] = useState(false)

  const [paintRef, setPaintRef] = useState(room.zoneCoordinates?.paintRef ?? '')
  const [dimensions, setDimensions] = useState(room.zoneCoordinates?.dimensions ?? '')
  const [notes, setNotes] = useState(room.zoneCoordinates?.notes ?? '')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const isFirstTechnicalRender = useRef(true)

  const debouncedPaintRef = useDebounce(paintRef, 1000)
  const debouncedDimensions = useDebounce(dimensions, 1000)
  const debouncedNotes = useDebounce(notes, 1000)

  const isDirty =
    paintRef !== debouncedPaintRef ||
    dimensions !== debouncedDimensions ||
    notes !== debouncedNotes

  useEffect(() => {
    Promise.all([getDocumentsByRoomId(room.id), getWorkOrdersByUnitId(unitId)])
      .then(([docs, allWorkOrders]) => {
        setDocuments(docs)
        setWorkOrders(allWorkOrders.filter((workOrder) => workOrder.roomId === room.id))
      })
      .catch(() => {
        toast.error('Erreur lors du chargement des données de la pièce')
      })
      .finally(() => setLoading(false))
  }, [room.id, unitId])

  useEffect(() => {
    if (isFirstTechnicalRender.current) {
      isFirstTechnicalRender.current = false
      return
    }
    updateRoom(room.id, {
      zoneCoordinates: {
        paintRef: debouncedPaintRef,
        dimensions: debouncedDimensions,
        notes: debouncedNotes,
      },
    })
      .then(() => setSavedAt(Date.now()))
      .catch(() => {
        toast.error('Erreur lors de la sauvegarde')
      })
  }, [room.id, debouncedPaintRef, debouncedDimensions, debouncedNotes])

  function startEditingName() {
    setDraftName(room.name)
    setEditingName(true)
  }

  async function confirmRename() {
    const trimmed = draftName.trim()
    if (!trimmed || trimmed === room.name) {
      setEditingName(false)
      return
    }

    setRenaming(true)
    try {
      await updateRoom(room.id, { name: trimmed })
      toast.success('Pièce renommée')
      setEditingName(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du renommage')
    } finally {
      setRenaming(false)
    }
  }

  function cancelRename() {
    setDraftName(room.name)
    setEditingName(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-[420px]">
        <SheetHeader>
          {editingName ? (
            <div className="flex items-center gap-2 pr-8">
              <Input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void confirmRename()
                  if (event.key === 'Escape') cancelRename()
                }}
                className="h-8"
                disabled={renaming}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer text-primary"
                onClick={() => void confirmRename()}
                disabled={renaming}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Confirmer</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                onClick={cancelRename}
                disabled={renaming}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Annuler</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pr-8">
              <SheetTitle>{room.name}</SheetTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                onClick={startEditingName}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Renommer</span>
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <Tabs defaultValue="documents">
            <TabsList className="w-full">
              <TabsTrigger value="documents" className="flex-1">
                Documents
              </TabsTrigger>
              <TabsTrigger value="work-orders" className="flex-1">
                Travaux
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex-1">
                Infos techniques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Documents de la pièce</p>
                <AddDocumentButton
                  propertySlug={propertySlug}
                  unitSlug={unitSlug}
                  roomId={room.id}
                  label="Ajouter"
                />
              </div>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <DocumentList documents={documents} />
              )}
            </TabsContent>

            <TabsContent value="work-orders" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Travaux de la pièce</p>
                <AddWorkOrderButton unitId={unitId} roomId={room.id} label="Ajouter" />
              </div>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : workOrders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune intervention pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((workOrder) => (
                    <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="technical" className="space-y-4 pt-4">
              <div className="flex items-center justify-end">
                <span className="text-xs text-muted-foreground">
                  {isDirty
                    ? 'Modification en cours...'
                    : savedAt
                      ? 'Sauvegardé ✓'
                      : null}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Références peinture</label>
                <Textarea
                  placeholder="Ex: Dulux blanc cassé 7023-Y, finition mate"
                  value={paintRef}
                  onChange={(event) => setPaintRef(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Dimensions</label>
                <Textarea
                  placeholder="Ex: L 4,2m × l 3,1m, hauteur 2,5m"
                  value={dimensions}
                  onChange={(event) => setDimensions(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Notes libres</label>
                <Textarea
                  placeholder="Informations complémentaires..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

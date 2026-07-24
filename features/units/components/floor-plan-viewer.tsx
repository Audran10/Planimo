'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Save, Sparkles, Square, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import {
  deleteFloorPlan,
  segmentFloorPlan,
  updateFloorPlanZones,
} from '@/features/units/actions/floor-plan'
import { RoomDetailPanel } from '@/features/units/components/room-detail-panel'
import type { FloorPlanZone } from '@/core/types'
import type { RoomWithMeta, UnitDetail } from '@/features/units/types'

interface FloorPlanViewerProps {
  unit: UnitDetail
  zones: FloorPlanZone[]
  rooms: RoomWithMeta[]
}

const HANDLES = ['nw', 'ne', 'sw', 'se'] as const
type HandlePosition = (typeof HANDLES)[number]

const ZONE_COLORS = [
  { fill: 'rgba(99, 102, 241, 0.15)', stroke: '#6366f1' },
  { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981' },
  { fill: 'rgba(245, 158, 11, 0.15)', stroke: '#f59e0b' },
  { fill: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444' },
  { fill: 'rgba(168, 85, 247, 0.15)', stroke: '#a855f7' },
  { fill: 'rgba(20, 184, 166, 0.15)', stroke: '#14b8a6' },
  { fill: 'rgba(249, 115, 22, 0.15)', stroke: '#f97316' },
  { fill: 'rgba(236, 72, 153, 0.15)', stroke: '#ec4899' },
]

interface DragState {
  type: 'move' | 'resize' | 'create'
  zoneId: string
  handle?: HandlePosition
  startX: number
  startY: number
  original?: FloorPlanZone
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function FloorPlanViewer({ unit, zones: initialZones, rooms }: FloorPlanViewerProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragState = useRef<DragState | null>(null)
  const zoneIdCounter = useRef(0)

  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 })
  const [zones, setZones] = useState<FloorPlanZone[]>(initialZones)
  const [editMode, setEditMode] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithMeta | null>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function updateImgDimensions() {
    if (!imgRef.current || !containerRef.current) return
    const imgRect = imgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    setImgDimensions({
      width: imgRect.width,
      height: imgRect.height,
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
    })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    updateImgDimensions()

    const observer = new ResizeObserver(updateImgDimensions)
    observer.observe(container)
    return () => observer.disconnect()
  }, [unit.floorPlanUrl])

  function findRoomForZone(zoneId: string) {
    return rooms.find((room) => room.slug === zoneId) ?? null
  }

  function percentFromEvent(event: ReactPointerEvent) {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect || imgDimensions.width === 0 || imgDimensions.height === 0) {
      return { x: 0, y: 0 }
    }
    const localX = event.clientX - containerRect.left - imgDimensions.left
    const localY = event.clientY - containerRect.top - imgDimensions.top
    return {
      x: clamp((localX / imgDimensions.width) * 100, 0, 100),
      y: clamp((localY / imgDimensions.height) * 100, 0, 100),
    }
  }

  function toPxX(percent: number) {
    return (percent / 100) * imgDimensions.width
  }
  function toPxY(percent: number) {
    return (percent / 100) * imgDimensions.height
  }
  function toPxWidth(percent: number) {
    return (percent / 100) * imgDimensions.width
  }
  function toPxHeight(percent: number) {
    return (percent / 100) * imgDimensions.height
  }

  function handleZoneClick(zone: FloorPlanZone) {
    if (editMode) return
    const room = findRoomForZone(zone.id)
    if (room) setSelectedRoom(room)
  }

  function handleZonePointerDown(event: ReactPointerEvent, zone: FloorPlanZone) {
    if (!editMode) return
    event.stopPropagation()
    const { x, y } = percentFromEvent(event)
    dragState.current = { type: 'move', zoneId: zone.id, startX: x, startY: y, original: zone }
  }

  function handleHandlePointerDown(
    event: ReactPointerEvent,
    zone: FloorPlanZone,
    handle: HandlePosition
  ) {
    event.stopPropagation()
    const { x, y } = percentFromEvent(event)
    dragState.current = {
      type: 'resize',
      zoneId: zone.id,
      handle,
      startX: x,
      startY: y,
      original: zone,
    }
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent) {
    if (!editMode || !addingRoom) return
    const { x, y } = percentFromEvent(event)
    zoneIdCounter.current += 1
    const newZone: FloorPlanZone = {
      id: `piece-${zoneIdCounter.current}`,
      name: 'Nouvelle pièce',
      coordinates: { x, y, width: 0, height: 0 },
    }
    dragState.current = { type: 'create', zoneId: newZone.id, startX: x, startY: y }
    setZones((current) => [...current, newZone])
  }

  function handlePointerMove(event: ReactPointerEvent) {
    const drag = dragState.current
    if (!drag) return
    const { x, y } = percentFromEvent(event)

    if (drag.type === 'move' && drag.original) {
      const dx = x - drag.startX
      const dy = y - drag.startY
      const original = drag.original
      setZones((current) =>
        current.map((zone) =>
          zone.id === drag.zoneId
            ? {
                ...zone,
                coordinates: {
                  ...zone.coordinates,
                  x: clamp(original.coordinates.x + dx, 0, 100),
                  y: clamp(original.coordinates.y + dy, 0, 100),
                },
              }
            : zone
        )
      )
    }

    if (drag.type === 'resize' && drag.original && drag.handle) {
      const dx = x - drag.startX
      const dy = y - drag.startY
      const { width: ow, height: oh } = drag.original.coordinates
      let widthDelta = 0
      let heightDelta = 0
      if (drag.handle === 'se') {
        widthDelta = dx * 2
        heightDelta = dy * 2
      } else if (drag.handle === 'nw') {
        widthDelta = -dx * 2
        heightDelta = -dy * 2
      } else if (drag.handle === 'ne') {
        widthDelta = dx * 2
        heightDelta = -dy * 2
      } else if (drag.handle === 'sw') {
        widthDelta = -dx * 2
        heightDelta = dy * 2
      }

      setZones((current) =>
        current.map((zone) =>
          zone.id === drag.zoneId
            ? {
                ...zone,
                coordinates: {
                  ...zone.coordinates,
                  width: clamp(ow + widthDelta, 4, 100),
                  height: clamp(oh + heightDelta, 4, 100),
                },
              }
            : zone
        )
      )
    }

    if (drag.type === 'create') {
      const width = Math.abs(x - drag.startX)
      const height = Math.abs(y - drag.startY)
      const originX = Math.min(x, drag.startX)
      const originY = Math.min(y, drag.startY)
      setZones((current) =>
        current.map((zone) =>
          zone.id === drag.zoneId
            ? {
                ...zone,
                coordinates: {
                  x: originX + width / 2,
                  y: originY + height / 2,
                  width,
                  height,
                },
              }
            : zone
        )
      )
    }
  }

  function handlePointerUp() {
    if (dragState.current?.type === 'create') setAddingRoom(false)
    dragState.current = null
  }

  function handleRemoveZone(zoneId: string) {
    setZones((current) => current.filter((zone) => zone.id !== zoneId))
  }

  function handleCancelEdit() {
    setZones(initialZones)
    setEditMode(false)
    setAddingRoom(false)
  }

  async function handleAnalyze() {
    if (!unit.floorPlanUrl) return
    setAnalyzing(true)
    try {
      const result = await segmentFloorPlan(unit.id, unit.floorPlanUrl)
      const count = result.zones.length
      toast.success(
        `${count} pièce${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''} (confiance : ${Math.round(result.confidence * 100)} %)`
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'analyse")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteFloorPlan(unit.id)
      toast.success('Plan supprimé')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateFloorPlanZones(unit.id, zones)
      toast.success('Zones sauvegardées')
      setEditMode(false)
      setAddingRoom(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {editMode ? (
          <>
            <Button
              variant={addingRoom ? 'default' : 'outline'}
              className="cursor-pointer gap-2"
              onClick={() => setAddingRoom((current) => !current)}
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              Ajouter une pièce
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Annuler
            </Button>
            <Button className="cursor-pointer gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </>
        ) : (
          <>
            {zones.length === 0 && (
              <Button
                className="cursor-pointer gap-2"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {analyzing ? 'Analyse en cours...' : "Analyser avec l'IA"}
              </Button>
            )}
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Modifier les zones
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {deleting ? 'Suppression...' : 'Supprimer le plan'}
            </Button>
          </>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative flex max-h-[500px] w-full items-center justify-center overflow-hidden rounded-lg"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerDown={handleBackgroundPointerDown}
      >
        {unit.floorPlanUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={unit.floorPlanUrl}
            alt={`Plan de ${unit.name}`}
            className="block max-h-[500px] w-auto max-w-full"
            onLoad={updateImgDimensions}
            draggable={false}
          />
        )}

        <svg
          className="absolute overflow-visible"
          style={{
            top: imgDimensions.top,
            left: imgDimensions.left,
            width: imgDimensions.width,
            height: imgDimensions.height,
          }}
        >
          {zones.map((zone, index) => {
            const isHovered = hoveredZoneId === zone.id
            const room = findRoomForZone(zone.id)
            const isSelected = selectedRoom?.id === room?.id
            const displayName = room?.name ?? zone.name ?? 'Pièce sans nom'
            const color = ZONE_COLORS[index % ZONE_COLORS.length]

            const width = toPxWidth(zone.coordinates.width)
            const height = toPxHeight(zone.coordinates.height)
            const x = toPxX(zone.coordinates.x) - width / 2
            const y = toPxY(zone.coordinates.y) - height / 2

            const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5

            return (
              <g key={zone.id}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={4}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={strokeWidth}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Ouvrir la pièce ${room?.name || zone.name}`}
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  onPointerDown={(event) => handleZonePointerDown(event, zone)}
                  onClick={() => handleZoneClick(zone)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleZoneClick(zone)
                    }
                  }}
                >
                  <title>{displayName}</title>
                </rect>
                <foreignObject
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  className="pointer-events-none"
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center">
                    <span
                      className="line-clamp-2 break-words text-[13px] leading-tight font-semibold"
                      style={{ color: color.stroke }}
                    >
                      {displayName}
                    </span>
                  </div>
                </foreignObject>
                {editMode && (
                  <>
                    {HANDLES.map((handle) => {
                      const hx = handle.includes('w') ? x : x + width
                      const hy = handle.includes('n') ? y : y + height
                      return (
                        <circle
                          key={handle}
                          cx={hx}
                          cy={hy}
                          r={5}
                          fill={color.stroke}
                          className="cursor-nwse-resize"
                          onPointerDown={(event) =>
                            handleHandlePointerDown(event, zone, handle)
                          }
                        />
                      )
                    })}
                    <g
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRemoveZone(zone.id)
                      }}
                    >
                      <circle cx={x + width} cy={y} r={9} fill="#ef4444" />
                      <text
                        x={x + width}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={12}
                        className="select-none"
                      >
                        ×
                      </text>
                    </g>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {editMode && (
        <p className="text-xs text-muted-foreground">
          Faites glisser une pièce pour la déplacer, ou tirez depuis un coin pour la
          redimensionner. Activez « Ajouter une pièce » puis cliquez-glissez sur le plan
          pour dessiner une nouvelle zone.
        </p>
      )}

      {!editMode && zones.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucune pièce détectée pour le moment. Cliquez sur « Analyser avec l&apos;IA »
          pour les détecter automatiquement, ou sur « Modifier les zones » pour les
          dessiner manuellement.
        </p>
      )}

      {selectedRoom && (
        <RoomDetailPanel
          key={selectedRoom.id}
          room={selectedRoom}
          unitId={unit.id}
          propertySlug={unit.property.slug}
          unitSlug={unit.slug}
          open
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  )
}

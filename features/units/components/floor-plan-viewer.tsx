'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Save, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { updateFloorPlanZones } from '@/features/units/actions/floor-plan'
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

const ZONE_COLOR = 'hsl(239 84% 67%)'
const CONTAINER_HEIGHT = 550

interface DragState {
  type: 'move' | 'resize' | 'create'
  zoneId: string
  handle?: HandlePosition
  startX: number
  startY: number
  original?: FloorPlanZone
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// Mirrors the browser's own `object-fit: contain` computation so the SVG
// overlay can be positioned in the same rect the <img> actually renders
// into — this is the only way to keep zones aligned when the container's
// aspect ratio doesn't match the image's (no DOM API exposes that rect).
function getContainRect(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number
): Rect {
  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight }
  }

  const containerRatio = containerWidth / containerHeight
  const imageRatio = naturalWidth / naturalHeight

  let width: number
  let height: number
  if (imageRatio > containerRatio) {
    width = containerWidth
    height = containerWidth / imageRatio
  } else {
    height = containerHeight
    width = containerHeight * imageRatio
  }

  return { x: (containerWidth - width) / 2, y: (containerHeight - height) / 2, width, height }
}

export function FloorPlanViewer({ unit, zones: initialZones, rooms }: FloorPlanViewerProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragState = useRef<DragState | null>(null)
  const zoneIdCounter = useRef(0)

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [zones, setZones] = useState<FloorPlanZone[]>(initialZones)
  const [editMode, setEditMode] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithMeta | null>(null)
  const [saving, setSaving] = useState(false)

  const containRect = getContainRect(
    containerSize.width,
    containerSize.height,
    naturalSize.width,
    naturalSize.height
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function updateSize() {
      if (!el) return
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    }
    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
  }

  function findRoomForZone(zoneId: string) {
    return rooms.find((room) => room.slug === zoneId) ?? null
  }

  function percentFromEvent(event: ReactPointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || containRect.width === 0 || containRect.height === 0) return { x: 0, y: 0 }
    const localX = event.clientX - rect.left - containRect.x
    const localY = event.clientY - rect.top - containRect.y
    return {
      x: clamp((localX / containRect.width) * 100, 0, 100),
      y: clamp((localY / containRect.height) * 100, 0, 100),
    }
  }

  function toPxX(percent: number) {
    return containRect.x + (percent / 100) * containRect.width
  }
  function toPxY(percent: number) {
    return containRect.y + (percent / 100) * containRect.height
  }
  function toPxWidth(percent: number) {
    return (percent / 100) * containRect.width
  }
  function toPxHeight(percent: number) {
    return (percent / 100) * containRect.height
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
          <Button
            variant="outline"
            className="cursor-pointer gap-2"
            onClick={() => setEditMode(true)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier les zones
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg"
        style={{ height: CONTAINER_HEIGHT }}
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
            onLoad={handleImageLoad}
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}

        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {zones.map((zone) => {
            const isHovered = hoveredZoneId === zone.id
            const room = findRoomForZone(zone.id)
            const isSelected = selectedRoom?.id === room?.id
            const displayName = room?.name ?? zone.name ?? 'Pièce sans nom'

            const width = toPxWidth(zone.coordinates.width)
            const height = toPxHeight(zone.coordinates.height)
            const x = toPxX(zone.coordinates.x) - width / 2
            const y = toPxY(zone.coordinates.y) - height / 2

            const fill = isSelected
              ? 'hsl(239 84% 67% / 0.35)'
              : isHovered
                ? 'hsl(239 84% 67% / 0.25)'
                : 'hsl(239 84% 67% / 0.1)'
            const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5

            return (
              <g key={zone.id}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={4}
                  fill={fill}
                  stroke={ZONE_COLOR}
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
                />
                <foreignObject
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  className="pointer-events-none"
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center">
                    <span
                      className="truncate text-[12px] font-semibold"
                      style={{ color: ZONE_COLOR }}
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
                          fill={ZONE_COLOR}
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

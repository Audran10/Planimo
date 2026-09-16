'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
import {
  cellsOutline,
  labelAnchor,
  resizeBox,
  resizeCellZone,
  sameCell,
  withCells,
  zoneBox,
  zoneOfCell,
} from '@/features/units/lib/zone-geometry'
import { canWriteProperty } from '@/features/members/lib/permissions'
import { assignZoneColors } from '@/features/units/lib/zone-colors'
import type { FloorPlanCell, FloorPlanZone } from '@/core/types'
import type { RoomWithMeta, UnitDetail } from '@/features/units/types'

interface FloorPlanViewerProps {
  unit: UnitDetail
  zones: FloorPlanZone[]
  rooms: RoomWithMeta[]
  planId?: string
}

const HANDLES = ['nw', 'ne', 'sw', 'se'] as const
type HandlePosition = (typeof HANDLES)[number]

interface DragState {
  type: 'move' | 'resize' | 'create'
  zoneId: string
  handle?: HandlePosition
  startX: number
  startY: number
  original?: FloorPlanZone
  originalBox?: { left: number; top: number; width: number; height: number }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function FloorPlanViewer({
  unit,
  zones: initialZones,
  rooms,
  planId,
}: FloorPlanViewerProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragState = useRef<DragState | null>(null)

  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 })
  const [zones, setZones] = useState<FloorPlanZone[]>(initialZones)
  const [committedZones, setCommittedZones] = useState<FloorPlanZone[]>(initialZones)
  const [grid, setGrid] = useState<FloorPlanCell[]>(unit.floorPlanCells ?? [])
  const [editMode, setEditMode] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithMeta | null>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pendingServerSnapshot = useRef<string | null>(null)
  const canWrite = canWriteProperty(unit.role)
  const zoneColors = useMemo(() => assignZoneColors(zones), [zones])

  function rememberCommit(nextZones: FloorPlanZone[], nextCells: FloorPlanCell[]) {
    pendingServerSnapshot.current = JSON.stringify({
      zones: nextZones,
      cells: nextCells,
    })
  }

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

  // `useState` ne suit pas les props. On resynchronise seulement quand le
  // serveur envoie vraiment d'autres zones — pas à la sortie du mode édition,
  // où le snapshot est encore l'ancien (analyse IA) le temps que
  // `router.refresh()` aboutisse. Sans ça, les pièces et leurs noms
  // réapparaissent une fraction de seconde avant les modifications manuelles.
  const zonesKey = JSON.stringify(initialZones)
  const cellsKey = JSON.stringify(unit.floorPlanCells ?? [])
  useEffect(() => {
    if (editMode) return
    const incoming = JSON.stringify({
      zones: initialZones,
      cells: unit.floorPlanCells ?? [],
    })
    if (pendingServerSnapshot.current) {
      if (incoming !== pendingServerSnapshot.current) return
      pendingServerSnapshot.current = null
    }
    setZones(initialZones)
    setCommittedZones(initialZones)
    setGrid(unit.floorPlanCells ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- l'identité des tableaux change à chaque rendu
  }, [zonesKey, cellsKey])

  function findRoomForZone(zoneId: string) {
    return rooms.find((room) => room.slug === zoneId) ?? null
  }

  function labelForZone(zone: FloorPlanZone) {
    return findRoomForZone(zone.id)?.name ?? zone.name ?? 'Pièce sans nom'
  }

  // La trame vient de la détection des murs. Quand elle existe, les zones se
  // corrigent en cliquant des cellules ; sinon on garde le rectangle libre.
  const hasGrid = grid.length > 0

  function toggleCell(cell: FloorPlanCell) {
    setZones((current) => {
      const target = current.find((zone) => zone.id === selectedZoneId)
      if (!target) return current
      const belongs = (target.cells ?? []).some((member) => sameCell(member, cell))

      return current
        .map((zone) => {
          const cells = zone.cells ?? []
          if (zone.id === target.id) {
            return withCells(
              zone,
              belongs ? cells.filter((member) => !sameCell(member, cell)) : [...cells, cell]
            )
          }
          // Une cellule n'appartient qu'à une pièce : l'ajouter ici la retire
          // de celle qui la détenait.
          if (belongs || !cells.some((member) => sameCell(member, cell))) return zone
          return withCells(
            zone,
            cells.filter((member) => !sameCell(member, cell))
          )
        })
        .filter((zone) => zone.id === selectedZoneId || !zone.cells || zone.cells.length > 0)
    })
  }

  function handleCellClick(cell: FloorPlanCell) {
    if (addingRoom) {
      startZoneFromCell(cell)
      return
    }
    if (selectedZoneId) {
      toggleCell(cell)
      return
    }
    // Sans pièce sélectionnée, le clic sert à désigner celle à corriger.
    const owner = zoneOfCell(zones, cell)
    if (owner) setSelectedZoneId(owner.id)
  }

  function capturePointer(event: ReactPointerEvent) {
    containerRef.current?.setPointerCapture(event.pointerId)
  }

  function handleAddRoom() {
    setAddingRoom((current) => !current)
    setSelectedZoneId(null)
  }

  function startZoneFromCell(cell: FloorPlanCell) {
    const zone = withCells(
      {
        id: crypto.randomUUID(),
        name: 'Nouvelle pièce',
        coordinates: { x: 0, y: 0, width: 0, height: 0 },
        cells: [],
      },
      [cell]
    )
    setZones((current) =>
      current
        .map((existing) => {
          const cells = existing.cells ?? []
          if (!cells.some((member) => sameCell(member, cell))) return existing
          return withCells(
            existing,
            cells.filter((member) => !sameCell(member, cell))
          )
        })
        .filter((existing) => !existing.cells || existing.cells.length > 0)
        .concat(zone)
    )
    setSelectedZoneId(zone.id)
    setAddingRoom(false)
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
    // En mode ajout, le dessin d'une nouvelle pièce doit pouvoir commencer
    // même au-dessus d'une zone déjà posée.
    if (addingRoom) return
    event.stopPropagation()

    // Une zone composée de cellules ne se déplace pas : ses bords sont des
    // murs. On la sélectionne pour lui ajouter ou retirer des cellules.
    if (zone.cells) {
      setSelectedZoneId((current) => (current === zone.id ? null : zone.id))
      return
    }

    event.preventDefault()
    capturePointer(event)
    const { x, y } = percentFromEvent(event)
    dragState.current = { type: 'move', zoneId: zone.id, startX: x, startY: y, original: zone }
  }

  function handleHandlePointerDown(
    event: ReactPointerEvent,
    zone: FloorPlanZone,
    handle: HandlePosition
  ) {
    event.stopPropagation()
    event.preventDefault()
    if (addingRoom) return
    capturePointer(event)
    const { x, y } = percentFromEvent(event)
    dragState.current = {
      type: 'resize',
      zoneId: zone.id,
      handle,
      startX: x,
      startY: y,
      original: zone,
      originalBox: zoneBox(zone),
    }
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent) {
    if (!editMode || !addingRoom) return
    event.preventDefault()
    capturePointer(event)
    const { x, y } = percentFromEvent(event)
    const newZone: FloorPlanZone = {
      id: crypto.randomUUID(),
      name: 'Nouvelle pièce',
      coordinates: { x, y, width: 0, height: 0 },
    }
    dragState.current = { type: 'create', zoneId: newZone.id, startX: x, startY: y }
    setZones((current) => [...current, newZone])
  }

  function handlePointerMove(event: ReactPointerEvent) {
    const drag = dragState.current
    if (!drag) return
    event.preventDefault()
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

      if (drag.original.cells && drag.originalBox) {
        const nextBox = resizeBox(drag.originalBox, drag.handle, dx, dy)
        const source = drag.original
        setZones((current) =>
          current.map((zone) => (zone.id === drag.zoneId ? resizeCellZone(source, nextBox) : zone))
        )
      } else {
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

  function handlePointerUp(event: ReactPointerEvent) {
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId)
    }
    const drag = dragState.current
    if (drag?.type === 'create') {
      setZones((current) =>
        current.filter((zone) => {
          if (zone.id !== drag.zoneId) return true
          return zone.coordinates.width >= 4 && zone.coordinates.height >= 4
        })
      )
    }
    dragState.current = null
  }

  function handleRemoveZone(zoneId: string) {
    setZones((current) => current.filter((zone) => zone.id !== zoneId))
    setSelectedZoneId((current) => (current === zoneId ? null : current))
  }

  function handleCancelEdit() {
    setZones(committedZones)
    setEditMode(false)
    setAddingRoom(false)
    setSelectedZoneId(null)
    setSelectedRoom(null)
  }

  async function handleAnalyze() {
    if (!unit.floorPlanUrl) return
    setAnalyzing(true)
    try {
      const result = await segmentFloorPlan(unit.id, unit.floorPlanUrl, planId)
      const nextCells = result.cells ?? []
      rememberCommit(result.zones, nextCells)
      setZones(result.zones)
      setCommittedZones(result.zones)
      setGrid(nextCells)
      const count = result.zones.length
      toast.success(
        `${count} pièce${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''} (confiance : ${Math.round(result.confidence * 100)} %)`
      )
      setSelectedRoom(null)
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
      await deleteFloorPlan(unit.id, planId)
      rememberCommit([], [])
      setZones([])
      setCommittedZones([])
      setGrid([])
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
      const next = zones.filter((zone) => {
        if (zone.cells) return zone.cells.length > 0
        return zone.coordinates.width >= 4 && zone.coordinates.height >= 4
      })
      const saved = await updateFloorPlanZones(unit.id, next, planId)
      rememberCommit(saved.zones, grid)
      setZones(saved.zones)
      setCommittedZones(saved.zones)
      toast.success('Zones sauvegardées')
      setEditMode(false)
      setAddingRoom(false)
      setSelectedZoneId(null)
      setSelectedRoom(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {canWrite && (
      <div className="flex items-center justify-end gap-2">
        {editMode ? (
          <>
            <Button
              variant={addingRoom ? 'default' : 'outline'}
              className="cursor-pointer gap-2"
              aria-pressed={addingRoom}
              onClick={handleAddRoom}
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
            {/* Relançable même avec des zones : une analyse décevante se
                reprend sans avoir à supprimer le plan. */}
            <Button
              variant={zones.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer gap-2"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {analyzing
                ? 'Analyse en cours...'
                : zones.length === 0
                  ? "Analyser avec l'IA"
                  : "Relancer l'analyse"}
            </Button>
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
      )}

      <div
        ref={containerRef}
        className="relative flex max-h-[500px] w-full select-none items-center justify-center overflow-hidden rounded-lg"
        style={{ touchAction: editMode ? 'none' : undefined }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={handleBackgroundPointerDown}
      >
        {unit.floorPlanUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={unit.floorPlanUrl}
            alt={`Plan de ${unit.name}`}
            className="pointer-events-none block max-h-[500px] w-auto max-w-full select-none [-webkit-user-drag:none]"
            onLoad={updateImgDimensions}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
          />
        )}

        <svg
          className="absolute overflow-visible select-none"
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
            const isEditing = selectedZoneId === zone.id
            const displayName = labelForZone(zone)
            const color = zoneColors.get(zone.id) ?? {
              fill: 'rgba(100, 116, 139, 0.15)',
              stroke: '#64748b',
            }

            const box = zoneBox(zone)
            const width = toPxWidth(box.width)
            const height = toPxHeight(box.height)
            const x = toPxX(box.left)
            const y = toPxY(box.top)

            const label = labelAnchor(zone)
            const strokeWidth = isEditing ? 3 : isSelected ? 2.5 : isHovered ? 2 : 1.5
            const cells = zone.cells ?? []

            return (
              <g key={zone.id || `zone-${index}`}>
                <g
                  className="cursor-pointer outline-none"
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
                  {cells.length > 0 ? (
                    <>
                      {/* Le remplissage est posé cellule par cellule, et seules
                          les arêtes extérieures sont tracées : le contour suit
                          alors les murs, même sur une pièce en L. */}
                      {cells.map((cell, cellIndex) => (
                        <rect
                          key={`${cell.x}-${cell.y}-${cellIndex}`}
                          x={toPxX(cell.x)}
                          y={toPxY(cell.y)}
                          width={toPxWidth(cell.width)}
                          height={toPxHeight(cell.height)}
                          fill={color.fill}
                        />
                      ))}
                      {cellsOutline(cells).map((segment, segmentIndex) => (
                        <line
                          key={`outline-${segmentIndex}`}
                          x1={toPxX(segment.x1)}
                          y1={toPxY(segment.y1)}
                          x2={toPxX(segment.x2)}
                          y2={toPxY(segment.y2)}
                          stroke={color.stroke}
                          strokeWidth={strokeWidth}
                          strokeLinecap="square"
                        />
                      ))}
                    </>
                  ) : width > 0 && height > 0 ? (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={4}
                      fill={color.fill}
                      stroke={color.stroke}
                      strokeWidth={strokeWidth}
                    />
                  ) : null}
                </g>
                {width > 0 && height > 0 && (
                  <foreignObject
                    x={toPxX(label.left)}
                    y={toPxY(label.top)}
                    width={toPxWidth(label.width)}
                    height={toPxHeight(label.height)}
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
                )}
              </g>
            )
          })}

          {/* Les cellules passent au-dessus des zones en édition : c'est sur
              elles que l'on clique pour composer une pièce. */}
          {editMode &&
            hasGrid &&
            grid.map((cell, index) => {
              const owner = zoneOfCell(zones, cell)
              const isTarget = Boolean(selectedZoneId) && owner?.id === selectedZoneId
              return (
                <rect
                  key={`cell-${index}`}
                  x={toPxX(cell.x)}
                  y={toPxY(cell.y)}
                  width={toPxWidth(cell.width)}
                  height={toPxHeight(cell.height)}
                  fill={owner ? 'transparent' : 'rgba(100, 116, 139, 0.08)'}
                  stroke={isTarget ? '#0f172a' : '#64748b'}
                  strokeWidth={isTarget ? 2 : 1}
                  strokeDasharray="4 3"
                  className="pointer-events-none cursor-pointer"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    handleCellClick(cell)
                  }}
                >
                  <title>
                    {addingRoom
                      ? 'Cliquer pour créer une nouvelle pièce'
                      : owner
                        ? `Cellule de ${owner.name}`
                        : 'Cellule libre — cliquez pour l’ajouter à la pièce sélectionnée'}
                  </title>
                </rect>
              )
            })}

          {editMode &&
            zones.map((zone) => {
              const box = zoneBox(zone)
              if (box.width <= 0 || box.height <= 0) return null
              const hx0 = toPxX(box.left)
              const hy0 = toPxY(box.top)
              const hx1 = toPxX(box.left + box.width)
              const hy1 = toPxY(box.top + box.height)
              const color = zoneColors.get(zone.id) ?? { stroke: '#64748b', fill: '' }
              return (
                <g key={`handles-${zone.id}`}>
                  {HANDLES.map((handle) => {
                    const cx = handle.includes('w') ? hx0 : hx1
                    const cy = handle.includes('n') ? hy0 : hy1
                    return (
                      <g
                        key={handle}
                        className="cursor-nwse-resize"
                        onPointerDown={(event) =>
                          handleHandlePointerDown(event, zone, handle)
                        }
                      >
                        <circle cx={cx} cy={cy} r={16} fill="transparent" />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={7}
                          fill={color.stroke}
                          stroke="white"
                          strokeWidth={2}
                        />
                      </g>
                    )
                  })}
                </g>
              )
            })}

          {/* Au-dessus de la trame : sinon le clic sur la croix tombe sur une
              cellule et retire un morceau au lieu de supprimer la pièce. */}
          {editMode &&
            zones.map((zone) => {
              const box = labelAnchor(zone)
              if (box.width <= 0 && box.height <= 0) return null
              const cx = toPxX(box.left + box.width) - 2
              const cy = toPxY(box.top) + 2
              return (
                <g
                  key={`remove-${zone.id}`}
                  className="cursor-pointer"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    event.preventDefault()
                    handleRemoveZone(zone.id)
                  }}
                >
                  <circle cx={cx} cy={cy} r={14} fill="transparent" />
                  <circle cx={cx} cy={cy} r={9} fill="#ef4444" />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={12}
                    className="pointer-events-none select-none"
                  >
                    ×
                  </text>
                </g>
              )
            })}
        </svg>
      </div>

      {editMode && (
        <p className="text-xs text-muted-foreground">
          {hasGrid
            ? addingRoom
              ? 'Cliquez-glissez pour dessiner la nouvelle pièce (cuisine, etc.) sur la zone libérée.'
              : 'Tirez un coin pour réduire une pièce trop large, puis « Ajouter une pièce » pour tracer celle qui reste.'
            : addingRoom
              ? 'Cliquez-glissez sur le plan pour dessiner une pièce. Vous pouvez en dessiner plusieurs à la suite, puis recliquer « Ajouter une pièce » pour quitter le mode ajout.'
              : 'Faites glisser une pièce pour la déplacer, ou tirez depuis un coin pour la redimensionner. Activez « Ajouter une pièce » puis cliquez-glissez sur le plan pour dessiner une nouvelle zone.'}
        </p>
      )}

      {!editMode && canWrite && zones.length === 0 && (
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
          canWrite={canWrite}
          open
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  )
}

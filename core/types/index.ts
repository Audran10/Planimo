export type PropertyType =
  | 'apartment_building'
  | 'house'
  | 'commercial'

export type DocumentType =
  | 'lease'
  | 'inventory'
  | 'invoice'
  | 'insurance'
  | 'diagnostic'
  | 'other'

export type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'

export type MemberRole =
  | 'admin'
  | 'editor'
  | 'viewer'

export type PlanTier =
  | 'free'
  | 'starter'
  | 'pro'
  | 'agency'

export interface FloorPlanZone {
  id: string
  name: string
  coordinates: {
    x: number       // pourcentage depuis la gauche (0-100)
    y: number       // pourcentage depuis le haut (0-100)
    width: number   // pourcentage de la largeur totale
    height: number  // pourcentage de la hauteur totale
  }
}

export interface SegmentPlanResponse {
  zones: FloorPlanZone[]
  confidence: number
}

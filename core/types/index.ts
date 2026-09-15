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

/** Rectangle délimité par des murs détectés sur le plan, en pourcentage. */
export interface FloorPlanCell {
  x: number       // pourcentage depuis la gauche (0-100)
  y: number       // pourcentage depuis le haut (0-100)
  width: number   // pourcentage de la largeur totale
  height: number  // pourcentage de la hauteur totale
}

export interface FloorPlanZone {
  id: string
  name: string
  coordinates: {
    x: number       // centre, en pourcentage depuis la gauche (0-100)
    y: number       // centre, en pourcentage depuis le haut (0-100)
    width: number   // pourcentage de la largeur totale
    height: number  // pourcentage de la hauteur totale
  }
  /**
   * Cellules murales composant la pièce. Absent sur les zones dessinées à la
   * main ou issues d'un plan dont les murs n'ont pas pu être détectés : la
   * zone est alors le simple rectangle de `coordinates`.
   */
  cells?: FloorPlanCell[]
}

export interface SegmentPlanResponse {
  zones: FloorPlanZone[]
  confidence: number
}

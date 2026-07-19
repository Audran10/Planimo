import { Building2, Home, Store, type LucideIcon } from 'lucide-react'
import type { PropertyType } from '@/core/types'

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment_building: "Immeuble d'appartements",
  house: 'Maison',
  commercial: 'Local commercial',
}

export const propertyTypeIcons: Record<PropertyType, LucideIcon> = {
  apartment_building: Building2,
  house: Home,
  commercial: Store,
}

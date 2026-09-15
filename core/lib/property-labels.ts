export function getUnitLabel(type: string, plural = false): string {
  switch (type) {
    case 'apartment_building':
      return plural ? 'Appartements' : 'Appartement'
    case 'commercial':
      return plural ? 'Locaux' : 'Local'
    default:
      return plural ? 'Unités' : 'Unité'
  }
}

export function getFloorPlanLabel(type: string, plural = false): string {
  switch (type) {
    case 'house':
      return plural ? 'Plans de la maison' : 'Plan de la maison'
    case 'commercial':
      return plural ? 'Plans du local' : 'Plan du local'
    default:
      return plural ? "Plans de l'appartement" : "Plan de l'appartement"
  }
}

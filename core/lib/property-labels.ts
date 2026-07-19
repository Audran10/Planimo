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

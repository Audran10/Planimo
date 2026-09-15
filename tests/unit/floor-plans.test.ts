import { describe, expect, it } from 'vitest'
import {
  defaultFloorPlanName,
  listFloorPlans,
} from '@/features/units/lib/floor-plans'

describe('defaultFloorPlanName', () => {
  it('labels the ground floor and upper floors', () => {
    expect(defaultFloorPlanName(0)).toBe('Rez-de-chaussée')
    expect(defaultFloorPlanName(1)).toBe('1er étage')
    expect(defaultFloorPlanName(2)).toBe('2e étage')
  })
})

describe('listFloorPlans', () => {
  it('wraps a legacy single plan', () => {
    const plans = listFloorPlans({
      floorPlanUrl: 'https://x/plan.png',
      floorPlanZones: [],
      floorPlanCells: null,
      floorPlans: null,
    })

    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      id: 'default',
      name: 'Rez-de-chaussée',
      url: 'https://x/plan.png',
    })
  })

  it('prefers the stored floorPlans array', () => {
    const plans = listFloorPlans({
      floorPlanUrl: 'https://x/old.png',
      floorPlans: [
        {
          id: 'p1',
          name: '1er étage',
          url: 'https://x/1.png',
          zones: [],
          cells: null,
        },
      ],
    })

    expect(plans).toEqual([
      expect.objectContaining({ id: 'p1', name: '1er étage' }),
    ])
  })
})

'use client'

import { useState, useEffect } from 'react'
import type { Unit } from '../types'

export function useUnits(propertyId: string) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(`/api/units?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then(setUnits)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [propertyId])

  return { units, loading, error }
}

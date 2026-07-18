'use client'

import { useState, useEffect } from 'react'
import type { Property } from '../types'

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then(setProperties)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { properties, loading, error }
}

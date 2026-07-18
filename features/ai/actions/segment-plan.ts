'use server'

import { anthropic } from '@/core/lib/anthropic'
import type { SegmentPlanResponse } from '@/core/types'

export async function segmentFloorPlan(
  imageUrl: string
): Promise<SegmentPlanResponse> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: `Analyse ce plan d'appartement et identifie toutes les pièces.
Pour chaque pièce, retourne un objet JSON avec :
- id : identifiant unique (slug en minuscules, ex: "salon", "chambre-1")
- name : nom de la pièce en français (ex: "Salon", "Chambre 1", "Salle de bain")
- coordinates : position et taille en pourcentage du plan total
  - x : position depuis la gauche (0-100)
  - y : position depuis le haut (0-100)
  - width : largeur (0-100)
  - height : hauteur (0-100)

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :
{
  "zones": [...],
  "confidence": 0.0 à 1.0
}`,
          },
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Réponse Claude inattendue')
  }

  try {
    const parsed = JSON.parse(content.text) as SegmentPlanResponse
    return parsed
  } catch {
    return {
      zones: [],
      confidence: 0,
    }
  }
}

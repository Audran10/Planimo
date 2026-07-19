'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/core/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import { documentTypeLabels } from '@/features/documents/constants'
import type { DocumentListItem } from '@/features/documents/types'
import type { DocumentType } from '@/core/types'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const filterOptions: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  ...(Object.entries(documentTypeLabels) as [DocumentType, string][]).map(
    ([value, label]) => ({ value, label })
  ),
]

export function DocumentsTable({ documents }: { documents: DocumentListItem[] }) {
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')

  const filtered = useMemo(
    () =>
      typeFilter === 'all'
        ? documents
        : documents.filter((document) => document.type === typeFilter),
    [documents, typeFilter]
  )

  return (
    <div className="space-y-4">
      <Select
        value={typeFilter}
        onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}
        items={filterOptions}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filtrer par type" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Bien</TableHead>
            <TableHead>Appartement</TableHead>
            <TableHead>Date upload</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Aucun document pour ce type
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((document) => (
              <TableRow
                key={document.id}
                className="cursor-pointer"
                onClick={() =>
                  window.open(document.fileUrl, '_blank', 'noopener,noreferrer')
                }
              >
                <TableCell className="font-medium">{document.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{documentTypeLabels[document.type]}</Badge>
                </TableCell>
                <TableCell>{document.propertyName}</TableCell>
                <TableCell>{document.unitName ?? '—'}</TableCell>
                <TableCell>{dateFormatter.format(document.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

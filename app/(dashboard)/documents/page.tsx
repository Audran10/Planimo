import { FileX } from 'lucide-react'
import { getAllDocuments } from '@/features/documents/actions/documents'
import { DocumentsTable } from '@/features/documents/components/documents-table'
import { Card, CardContent } from '@/core/components/ui/card'

export default async function DocumentsPage() {
  const documents = await getAllDocuments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Retrouvez l&apos;ensemble des documents de votre patrimoine.
        </p>
      </div>

      {documents.length === 0 ? (
        <Card className="border border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <FileX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun document pour le moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <DocumentsTable documents={documents} />
      )}
    </div>
  )
}

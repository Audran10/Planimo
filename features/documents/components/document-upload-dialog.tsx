'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import { FileUpload } from '@/core/components/shared/file-upload'
import { createDocument, uploadDocumentFile } from '@/features/documents/actions/documents'
import {
  documentSchema,
  type DocumentFormValues,
} from '@/features/documents/schemas/document.schema'
import { documentTypeLabels } from '@/features/documents/constants'
import { buildDocumentFilename } from '@/features/documents/lib/build-filename'
import { useSession } from '@/core/lib/auth-client'

const typeOptions = (
  Object.entries(documentTypeLabels) as [DocumentFormValues['type'], string][]
).map(([value, label]) => ({ value, label }))

interface DocumentUploadDialogProps {
  propertySlug: string
  unitSlug: string
  unitId?: string
  roomId?: string
  tenantId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUploadDialog({
  propertySlug,
  unitSlug,
  unitId,
  roomId,
  tenantId,
  open,
  onOpenChange,
}: DocumentUploadDialogProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', type: 'other', unitId, roomId, tenantId },
  })

  async function onSubmit(values: DocumentFormValues) {
    if (!file) {
      toast.error('Sélectionnez un fichier à uploader.')
      return
    }
    if (!session?.user) {
      toast.error('Session expirée, veuillez vous reconnecter.')
      return
    }

    setLoading(true)
    try {
      const path = `${session.user.id}/${propertySlug}/${unitSlug}/${values.type}/${buildDocumentFilename(file.name)}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'documents')
      formData.append('path', path)
      const uploaded = await uploadDocumentFile(formData)

      await createDocument({
        name: values.name,
        type: values.type,
        unitId,
        roomId,
        tenantId,
        fileUrl: uploaded.url,
        fileType: uploaded.fileType,
        fileSize: uploaded.fileSize,
      })

      toast.success('Document ajouté avec succès')
      form.reset({ name: '', type: 'other', unitId, roomId, tenantId })
      setFile(null)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>Uploadez un fichier PDF ou une image.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de document</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={typeOptions}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true" className="w-full">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du document</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Facture électricité janvier"
                      disabled={loading}
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Fichier</FormLabel>
              <FileUpload onFileSelect={setFile} disabled={loading} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={loading || !file}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

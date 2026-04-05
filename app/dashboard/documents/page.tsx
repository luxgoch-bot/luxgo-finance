'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SkeletonTable } from '@/components/ui/skeleton-table'
import { formatDateCh } from '@/lib/helpers/format'
import { useTranslations } from 'next-intl'
import {
  Upload,
  Search,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  X,
  FolderOpen,
  CloudUpload,
} from 'lucide-react'

type DocType = 'receipt' | 'invoice' | 'tax_form' | 'mwst_confirmation' | 'other'

interface Document {
  id: string
  profile_id: string
  type: DocType
  file_name: string
  storage_path: string
  linked_to?: string
  uploaded_at: string
  publicUrl?: string
}

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'receipt',           label: 'Receipt' },
  { value: 'invoice',           label: 'Invoice' },
  { value: 'tax_form',          label: 'Tax Form' },
  { value: 'mwst_confirmation', label: 'MWST Confirmation' },
  { value: 'other',             label: 'Other' },
]

const TYPE_BADGE: Record<DocType, string> = {
  receipt:           'bg-green-900/40 text-green-400 border-green-800',
  invoice:           'bg-blue-900/40 text-blue-400 border-blue-800',
  tax_form:          'bg-purple-900/40 text-purple-400 border-purple-800',
  mwst_confirmation: 'bg-amber-900/40 text-amber-400 border-amber-800',
  other:             'bg-gray-800 text-gray-400 border-gray-700',
}

const TYPE_LABEL: Record<DocType, string> = {
  receipt:           'Receipt',
  invoice:           'Invoice',
  tax_form:          'Tax Form',
  mwst_confirmation: 'MWST Confirmation',
  other:             'Other',
}

function detectType(filename: string, mime: string): DocType {
  const lower = filename.toLowerCase()
  if (lower.includes('mwst') || lower.includes('vat') || lower.includes('mehrwert')) return 'mwst_confirmation'
  if (lower.includes('invoice') || lower.includes('rechnung') || lower.includes('faktura')) return 'invoice'
  if (lower.includes('receipt') || lower.includes('quittung') || lower.includes('beleg')) return 'receipt'
  if (lower.includes('tax') || lower.includes('steuer') || lower.includes('steuern')) return 'tax_form'
  if (mime.startsWith('image/')) return 'receipt'
  return 'other'
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext ?? '')) return Image
  if (ext === 'pdf') return FileText
  return File
}

interface UploadItem {
  file: File
  type: DocType
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function DocumentsPage() {
  const supabase = createClient()
  const t = useTranslations('documents')
  // Translation hook commented out as it's not currently used
  // const tCommon = useTranslations('common')

  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ id: string } | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [preview, setPreview] = useState<Document | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!profiles?.length) { setLoading(false); return }
      const prof = profiles[0]
      setProfile(prof)

      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('profile_id', prof.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      // Get signed URLs for all docs
      const withUrls = await Promise.all((documents ?? []).map(async (doc) => {
        if (!doc.storage_path) return doc
        const { data } = await supabase.storage
          .from('luxgo-finance-docs')
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, publicUrl: data?.signedUrl }
      }))

      setDocs(withUrls)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const items: UploadItem[] = Array.from(files).map(file => ({
      file,
      type: detectType(file.name, file.type),
      progress: 0,
      status: 'pending',
    }))
    setUploads(items)
  }, [])

  async function runUploads() {
    if (!profile || uploads.length === 0) return
    setUploading(true)
    const year = new Date().getFullYear()
    let successCount = 0

    for (let i = 0; i < uploads.length; i++) {
      const item = uploads[i]
      setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'uploading' } : u))

      try {
        const safeFilename = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${profile.id}/${year}/${item.type}/${Date.now()}_${safeFilename}`

        const { error: uploadError } = await supabase.storage
          .from('luxgo-finance-docs')
          .upload(path, item.file, { upsert: false })

        if (uploadError) throw uploadError

        const { error: dbError } = await supabase.from('documents').insert({
          profile_id: profile.id,
          type: item.type === 'mwst_confirmation' ? 'other' : item.type,
          file_name: item.file.name,
          storage_path: path,
          uploaded_at: new Date().toISOString(),
        })

        if (dbError) throw dbError

        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'done', progress: 100 } : u))
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error: msg } : u))
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`)
      await loadData()
    }
    setUploading(false)

    setTimeout(() => {
      setUploads([])
    }, 2000)
  }

  async function updateDocType(doc: Document, newType: string) {
    // Map mwst_confirmation to 'other' in DB since it's not in the constraint
    const dbType = newType === 'mwst_confirmation' ? 'other' : newType
    const { error } = await supabase
      .from('documents')
      .update({ type: dbType })
      .eq('id', doc.id)

    if (error) {
      toast.error('Failed to update type')
    } else {
      toast.success('Document type updated')
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, type: newType as DocType } : d))
    }
  }

  async function deleteDocument() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.storage_path) {
        await supabase.storage.from('luxgo-finance-docs').remove([deleteTarget.storage_path])
      }
      const { error } = await supabase.from('documents').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Document deleted')
      setDocs(prev => prev.filter(d => d.id !== deleteTarget.id))
      if (preview?.id === deleteTarget.id) setPreview(null)
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleteTarget(null)
    }
  }

  const filtered = docs.filter(doc => {
    const matchSearch = !search || doc.file_name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || doc.type === typeFilter
    return matchSearch && matchType
  })

  const isImage = (filename: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(filename)
  const isPDF = (filename: string) => /\.pdf$/i.test(filename)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex h-full">
        {/* Main content */}
        <div className={`flex-1 flex flex-col transition-all ${preview ? 'mr-96' : ''}`}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{t('subtitle')}</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.csv"
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {/* Filters */}
            <div className="mt-4 flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  {...{'placeholder': t('searchFiles')}}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-amber-500"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-52 bg-gray-900 border-gray-800 text-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="all" className="text-white">All types</SelectItem>
                  {DOC_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-white">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload queue */}
          {uploads.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">{uploads.length} file{uploads.length > 1 ? 's' : ''} ready to upload</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setUploads([])}
                    className="border-gray-700 text-gray-400 hover:text-white">Cancel</Button>
                  <Button size="sm" onClick={runUploads} disabled={uploading}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                    {uploading ? 'Uploading…' : t('uploadAll')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {uploads.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                    <File className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-white truncate flex-1">{item.file.name}</span>
                    <Select
                      value={item.type}
                      onValueChange={(v) => setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, type: v as DocType } : u))}
                    >
                      <SelectTrigger className="w-44 h-7 text-xs bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        {DOC_TYPE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className={`text-xs shrink-0 ${
                      item.status === 'done' ? 'text-green-400' :
                      item.status === 'error' ? 'text-red-400' :
                      item.status === 'uploading' ? 'text-amber-400' : 'text-gray-500'
                    }`}>
                      {item.status === 'done' ? '✓ Done' :
                       item.status === 'error' ? '✗ Error' :
                       item.status === 'uploading' ? 'Uploading…' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone + table */}
          <div
            className={`flex-1 p-6 ${dragOver ? 'bg-amber-500/5 border-2 border-dashed border-amber-500 rounded-xl m-4' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
          >
            {loading ? (
              <SkeletonTable rows={6} cols={5} />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">
                  {search || typeFilter !== 'all' ? t('noMatch') : t('noDocuments').split('—')[0].trim()}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {search || typeFilter !== 'all'
                    ? t('adjustFilters')
                    : 'Drag files here or click "Upload Files" to add receipts, invoices, and tax forms'}
                </p>
                {!search && typeFilter === 'all' && (
                  <div className="mt-6 flex items-center gap-2 text-gray-700 text-sm">
                    <CloudUpload className="h-5 w-5" />
                    <span>Supports: PDF, JPG, PNG, CSV</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">File</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(doc => {
                      const Icon = getFileIcon(doc.file_name)
                      return (
                        <tr
                          key={doc.id}
                          className={`border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition-colors ${preview?.id === doc.id ? 'bg-amber-500/5' : ''}`}
                          onClick={() => setPreview(preview?.id === doc.id ? null : doc)}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                              <span className="text-white truncate max-w-xs">{doc.file_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                            <Select value={doc.type} onValueChange={v => updateDocType(doc, v)}>
                              <SelectTrigger className="w-44 h-7 text-xs bg-transparent border-gray-700 text-white p-1">
                                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${TYPE_BADGE[doc.type]}`}>
                                  {TYPE_LABEL[doc.type]}
                                </div>
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-800">
                                {DOC_TYPE_OPTIONS.map(o => (
                                  <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-3 text-gray-400">{formatDateCh(doc.uploaded_at)}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setPreview(preview?.id === doc.id ? null : doc)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors"
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {doc.publicUrl && (
                                <a
                                  href={doc.publicUrl}
                                  download={doc.file_name}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                onClick={() => setDeleteTarget(doc)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {preview && (
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-40 ml-64">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-white truncate flex-1 pr-2">{preview.file_name}</p>
              <button onClick={() => setPreview(null)} className="p-1 text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {preview.publicUrl ? (
                isImage(preview.file_name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.publicUrl} alt={preview.file_name} className="w-full rounded-lg" />
                ) : isPDF(preview.file_name) ? (
                  <iframe src={preview.publicUrl} className="w-full h-full min-h-96 rounded-lg border border-gray-800" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <File className="h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400 text-sm">{t('previewUnavailable')}</p>
                    <a href={preview.publicUrl} download={preview.file_name}
                      className="mt-3 text-amber-400 text-sm hover:underline flex items-center gap-1">
                      <Download className="h-4 w-4" /> Download file
                    </a>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <File className="h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">No preview available</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-800 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Type</span>
                <span className={`px-2 py-0.5 rounded-full border ${TYPE_BADGE[preview.type]}`}>
                  {TYPE_LABEL[preview.type]}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploaded</span>
                <span className="text-gray-300">{formatDateCh(preview.uploaded_at)}</span>
              </div>
              {preview.publicUrl && (
                <a href={preview.publicUrl} download={preview.file_name}
                  className="flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-lg bg-gray-800 text-sm text-white hover:bg-gray-700 transition-colors">
                  <Download className="h-4 w-4" /> Download
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              <strong className="text-white">{deleteTarget?.file_name}</strong> will be permanently deleted from storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}
              className="border-gray-700 text-gray-300 hover:text-white">Cancel</Button>
            <Button onClick={deleteDocument} className="bg-red-600 hover:bg-red-500 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

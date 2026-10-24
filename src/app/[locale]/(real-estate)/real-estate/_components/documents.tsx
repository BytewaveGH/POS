'use client'

/* eslint-disable @next/next/no-img-element -- previews of the owner's own files via object URLs */
import React, { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, Eye, FileImage, FileText, Loader2, MessageCircle, Paperclip, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DOCUMENT_CATEGORIES, documentCategoryLabel } from '../_logics/constants'
import { shortDate } from '../_logics/format'
import { usePortfolio, useRealEstateActions, type Portfolio } from '../_logics/hooks'
import { ACCEPT_ATTR, downloadBlob, fileProblem, formatBytes, isImage, isPdf, shareToWhatsApp } from '../_logics/share'
import type { DocumentCategory, DocumentRecord } from '../_logics/types'
import { Button, EmptyState } from './ui'
import { ConfirmDialog, Drawer, Field, FormGrid, Input, Select, Textarea } from './form'

export type DocumentLinks = Partial<Pick<DocumentRecord, 'propertyId' | 'unitId' | 'tenantId' | 'leaseId' | 'projectId'>> & {
  category?: DocumentCategory
}

// "Asokwa Compound · Room 3 · Kwame Mensah" — where a document belongs.
export const documentContext = (
  doc: DocumentRecord,
  p: Pick<Portfolio, 'propertyById' | 'unitById' | 'tenantById' | 'projects' | 'leases'>
) => {
  const lease = doc.leaseId ? p.leases.find((l) => l.id === doc.leaseId) : undefined
  const tenantId = doc.tenantId ?? lease?.tenantId
  const unitId = doc.unitId ?? lease?.unitId
  const unit = unitId ? p.unitById.get(unitId) : undefined
  const propertyId = doc.propertyId ?? unit?.propertyId
  return [
    propertyId ? p.propertyById.get(propertyId)?.name : undefined,
    unit?.name,
    tenantId ? p.tenantById.get(tenantId)?.fullName : undefined,
    doc.projectId ? p.projects.find((x) => x.id === doc.projectId)?.name : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

// Phone to address WhatsApp to: the linked tenant's, directly or via the tenancy.
const documentPhone = (doc: DocumentRecord, p: Portfolio) => {
  const tenantId = doc.tenantId ?? (doc.leaseId ? p.leases.find((l) => l.id === doc.leaseId)?.tenantId : undefined)
  return tenantId ? p.tenantById.get(tenantId)?.phone : undefined
}

// ── Upload ───────────────────────────────────────────────────────────────────

export const DocumentUploadForm = ({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  preset?: DocumentLinks | null
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [files, setFiles] = useState<File[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('other')
  const [propertyId, setPropertyId] = useState('')
  const [leaseId, setLeaseId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFiles([])
    setProblems([])
    setTitle('')
    setCategory(preset?.category ?? (preset?.leaseId ? 'tenancy-agreement' : 'other'))
    const lease = preset?.leaseId ? p.leases.find((l) => l.id === preset.leaseId) : undefined
    const unit = lease ? p.unitById.get(lease.unitId) : undefined
    setPropertyId(String(preset?.propertyId ?? unit?.propertyId ?? ''))
    setLeaseId(String(preset?.leaseId ?? ''))
    setProjectId(String(preset?.projectId ?? ''))
    setNotes('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset])

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list)
    const bad = incoming.map(fileProblem).filter(Boolean) as string[]
    const good = incoming.filter((f) => !fileProblem(f))
    setProblems(bad)
    setFiles((cur) => [...cur, ...good])
    if (good.length === 1 && files.length === 0) setTitle(good[0].name.replace(/\.[^.]+$/, ''))
  }

  const leases = p.leases.filter((l) => !propertyId || p.unitById.get(l.unitId)?.propertyId === Number(propertyId))
  const projects = p.projects.filter((x) => !propertyId || x.propertyId === Number(propertyId))

  const submit = async () => {
    if (files.length === 0) return
    setSaving(true)
    const lease = leaseId ? p.leases.find((l) => l.id === Number(leaseId)) : undefined
    try {
      for (const f of files) {
        await actions.uploadDocument(
          {
            title: files.length === 1 && title.trim() ? title.trim() : f.name.replace(/\.[^.]+$/, ''),
            category,
            propertyId: propertyId ? Number(propertyId) : null,
            leaseId: lease?.id ?? null,
            tenantId: lease?.tenantId ?? preset?.tenantId ?? null,
            unitId: lease?.unitId ?? preset?.unitId ?? null,
            projectId: projectId ? Number(projectId) : null,
            notes: notes.trim() || undefined,
          },
          f
        )
      }
      toast.success(files.length === 1 ? 'Document saved' : `${files.length} documents saved`)
      onOpenChange(false)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      error={actions.error}
      open={open}
      onOpenChange={onOpenChange}
      title="Upload documents"
      description="Indentures, site plans, tenancy agreements, receipts, photos — PDF, image or Word, up to 15 MB each."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button icon={Upload} onClick={submit} loading={saving} disabled={files.length === 0}>
            {files.length > 1 ? `Upload ${files.length} files` : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors',
            dragging ? 'border-endeavour bg-endeavour/[0.04]' : 'border-stone-300 hover:border-endeavour/60'
          )}
        >
          <span className="h-11 w-11 rounded-2xl bg-endeavour/10 text-endeavour flex items-center justify-center">
            <Upload className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold text-stone-900">Drop files here or tap to choose</span>
          <span className="text-xs text-stone-500">On a phone you can take a photo of the document</span>
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="sr-only"
            aria-label="Choose files"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        {problems.map((m) => (
          <p key={m} className="text-xs text-rose-600 -mt-3">
            {m}
          </p>
        ))}
        {files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                <Paperclip className="h-4 w-4 text-stone-400 flex-shrink-0" />
                <span className="text-sm text-stone-700 truncate flex-1">{f.name}</span>
                <span className="text-xs text-stone-400">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                  className="text-stone-400 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length === 1 && (
          <Field label="Title" htmlFor="doc-title">
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        )}
        <Field label="Type of document" htmlFor="doc-cat">
          <Select
            id="doc-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            options={DOCUMENT_CATEGORIES}
          />
        </Field>
        <FormGrid>
          <Field label="Property" htmlFor="doc-prop">
            <Select
              id="doc-prop"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value)
                setLeaseId('')
                setProjectId('')
              }}
              options={[{ value: '', label: 'Not linked' }, ...p.properties.map((x) => ({ value: String(x.id), label: x.name }))]}
            />
          </Field>
          <Field label="Tenancy" htmlFor="doc-lease">
            <Select
              id="doc-lease"
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              options={[
                { value: '', label: 'Not linked' },
                ...leases.map((l) => ({
                  value: String(l.id),
                  label: `${p.tenantById.get(l.tenantId)?.fullName ?? 'Tenant'} · ${p.unitById.get(l.unitId)?.name ?? 'Unit'}`,
                })),
              ]}
            />
          </Field>
        </FormGrid>
        {projects.length > 0 && (
          <Field label="Building project" htmlFor="doc-project">
            <Select
              id="doc-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={[{ value: '', label: 'Not linked' }, ...projects.map((x) => ({ value: String(x.id), label: x.name }))]}
            />
          </Field>
        )}
        <Field label="Notes" htmlFor="doc-notes">
          <Textarea
            id="doc-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Original is in the safe at home"
          />
        </Field>
      </div>
    </Drawer>
  )
}

// ── Preview ──────────────────────────────────────────────────────────────────

const PreviewDialog = ({
  doc,
  onOpenChange,
  onDownload,
}: {
  doc: DocumentRecord | null
  onOpenChange: (o: boolean) => void
  onDownload: (d: DocumentRecord) => void
}) => {
  const actions = useRealEstateActions()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!doc) return
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setFailed(false)
    actions
      .getFile(doc)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  return (
    <Dialog.Root open={!!doc} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-3 sm:inset-8 z-50 rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-bold text-stone-900 truncate">{doc?.title}</Dialog.Title>
              <Dialog.Description className="text-xs text-stone-500 truncate">
                {doc ? `${documentCategoryLabel(doc.category)} · ${doc.fileName} · ${formatBytes(doc.size)}` : ''}
              </Dialog.Description>
            </div>
            {doc && (
              <Button size="sm" variant="secondary" icon={Download} onClick={() => onDownload(doc)}>
                Download
              </Button>
            )}
            <Dialog.Close
              className="h-9 w-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="flex-1 bg-stone-100 flex items-center justify-center overflow-auto">
            {failed ? (
              <p className="text-sm text-stone-500">This file couldn’t be opened.</p>
            ) : !url || !doc ? (
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            ) : isImage(doc.mimeType) ? (
              <img src={url} alt={doc.title} className="max-h-full max-w-full object-contain" />
            ) : isPdf(doc.mimeType) ? (
              <iframe src={url} title={doc.title} className="h-full w-full bg-white" />
            ) : (
              <div className="text-center">
                <FileText className="h-10 w-10 text-stone-300 mx-auto" />
                <p className="text-sm text-stone-600 mt-2">No preview for this file type — download it to open.</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── List ─────────────────────────────────────────────────────────────────────

export const DocumentList = ({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription,
  onUpload,
  showContext = true,
  singleColumn,
}: {
  documents: DocumentRecord[]
  emptyTitle?: string
  emptyDescription?: string
  onUpload?: () => void
  showContext?: boolean
  // For narrow places like drawers.
  singleColumn?: boolean
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const [preview, setPreview] = useState<DocumentRecord | null>(null)
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null)
  const [sharing, setSharing] = useState<number | null>(null)

  const download = async (doc: DocumentRecord) => {
    try {
      downloadBlob(await actions.getFile(doc), doc.fileName)
    } catch {
      // toast shown
    }
  }

  const share = async (doc: DocumentRecord) => {
    setSharing(doc.id)
    try {
      const link = await actions.shareLink(doc)
      const context = documentContext(doc, p)
      const message = `${doc.title}${context ? ` — ${context}` : ''}`
      const result = await shareToWhatsApp({
        title: doc.title,
        message,
        phone: documentPhone(doc, p),
        link,
        file: link ? null : { blob: await actions.getFile(doc), fileName: doc.fileName, mimeType: doc.mimeType },
      })
      if (result === 'downloaded') toast.info('File downloaded — attach it in the WhatsApp chat that just opened.')
    } catch {
      // toast shown
    } finally {
      setSharing(null)
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
        action={
          onUpload && (
            <Button icon={Upload} onClick={onUpload}>
              Upload documents
            </Button>
          )
        }
      />
    )
  }

  return (
    <>
      <div className={cn('grid gap-3', !singleColumn && 'sm:grid-cols-2 xl:grid-cols-3')}>
        {[...documents]
          .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
          .map((doc) => {
            const Icon = isImage(doc.mimeType) ? FileImage : FileText
            const context = showContext ? documentContext(doc, p) : ''
            const phone = documentPhone(doc, p)
            return (
              <div
                key={doc.id}
                className="group rounded-2xl border border-stone-200 bg-white p-4 flex flex-col gap-3 hover:shadow-[0_8px_24px_-16px_rgba(28,25,23,0.4)] transition-shadow"
              >
                <button type="button" onClick={() => setPreview(doc)} className="flex items-start gap-3 text-left">
                  <span
                    className={cn(
                      'h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      isPdf(doc.mimeType)
                        ? 'bg-rose-50 text-rose-600'
                        : isImage(doc.mimeType)
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-stone-100 text-stone-500'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-stone-900 truncate group-hover:text-endeavour">{doc.title}</span>
                    <span className="block text-[11px] font-semibold text-endeavour/80 mt-0.5">{documentCategoryLabel(doc.category)}</span>
                    {context && <span className="block text-xs text-stone-500 truncate mt-0.5">{context}</span>}
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">
                    {formatBytes(doc.size)} · {shortDate(doc.uploadedAt.slice(0, 10))}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <IconAction label="Preview" onClick={() => setPreview(doc)} icon={Eye} />
                    <IconAction label="Download" onClick={() => void download(doc)} icon={Download} />
                    <button
                      type="button"
                      onClick={() => void share(doc)}
                      disabled={sharing === doc.id}
                      aria-label={phone ? `Share on WhatsApp with ${phone}` : 'Share on WhatsApp'}
                      title={phone ? 'Share on WhatsApp with the tenant' : 'Share on WhatsApp'}
                      className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/10 disabled:opacity-50"
                    >
                      {sharing === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                      WhatsApp
                    </button>
                    {p.can.write('development') && <IconAction label="Delete" onClick={() => setDeleting(doc)} icon={Trash2} danger />}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
      <PreviewDialog doc={preview} onOpenChange={(o) => !o && setPreview(null)} onDownload={(d) => void download(d)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.title ?? 'document'}?`}
        description="The file is removed for good. Anything it was linked to stays."
        onConfirm={() => (deleting ? actions.remove('documents', deleting.id, { inline: true }) : undefined)}
      />
    </>
  )
}

const IconAction = ({
  label,
  onClick,
  icon: Icon,
  danger,
}: {
  label: string
  onClick: () => void
  icon: React.ElementType
  danger?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'h-8 w-8 rounded-lg inline-flex items-center justify-center text-stone-400',
      danger ? 'hover:text-rose-600 hover:bg-rose-50' : 'hover:text-endeavour hover:bg-stone-100'
    )}
  >
    <Icon className="h-4 w-4" />
  </button>
)

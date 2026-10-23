'use client'

import React, { useMemo, useState } from 'react'
import { HardDrive, Search, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio } from '../_logics/hooks'
import { DOCUMENT_CATEGORIES } from '../_logics/constants'
import { DATA_SOURCE_KIND } from '../_logics/data-source'
import { formatBytes } from '../_logics/share'
import { Button, ErrorNote, LoadingGrid, PageHeader } from '../_components/ui'
import { Select } from '../_components/form'
import { DocumentList, DocumentUploadForm, documentContext } from '../_components/documents'

export default function DocumentsPage() {
  const p = usePortfolio()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [propertyId, setPropertyId] = useState('')

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    p.documents.forEach((d) => m.set(d.category, (m.get(d.category) ?? 0) + 1))
    return m
  }, [p.documents])
  const totalSize = p.documents.reduce((s, d) => s + d.size, 0)

  const q = query.trim().toLowerCase()
  const list = p.documents.filter((d) => {
    if (category !== 'all' && d.category !== category) return false
    if (propertyId) {
      const unitProperty = d.unitId ? p.unitById.get(d.unitId)?.propertyId : undefined
      const leaseUnit = d.leaseId ? p.leases.find((l) => l.id === d.leaseId)?.unitId : undefined
      const leaseProperty = leaseUnit ? p.unitById.get(leaseUnit)?.propertyId : undefined
      const projectProperty = d.projectId ? p.projects.find((x) => x.id === d.projectId)?.propertyId : undefined
      if (![d.propertyId, unitProperty, leaseProperty, projectProperty].includes(Number(propertyId))) return false
    }
    return !q || `${d.title} ${d.fileName} ${documentContext(d, p)}`.toLowerCase().includes(q)
  })

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Documents"
        description="Land papers, tenancy agreements, receipts and photos — preview, download or send on WhatsApp."
        actions={
          <Button icon={Upload} onClick={() => setUploadOpen(true)}>
            Upload documents
          </Button>
        }
      />
      {p.error && <ErrorNote message={p.error} />}
      {DATA_SOURCE_KIND === 'local' && p.documents.length > 0 && (
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-stone-500">
          <HardDrive className="h-3.5 w-3.5" /> {p.documents.length} files · {formatBytes(totalSize)} stored in this browser. Keep the
          originals somewhere safe too.
        </p>
      )}

      {p.isLoading ? (
        <LoadingGrid count={3} className="xl:grid-cols-3" />
      ) : (
        <>
          {p.documents.length > 0 && (
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title, file, property or tenant"
                    aria-label="Search documents"
                    className="w-full h-10 rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-base sm:text-sm focus:outline-none focus:border-endeavour focus:ring-2 focus:ring-endeavour/15"
                  />
                </div>
                {p.properties.length > 1 && (
                  <div className="sm:w-64">
                    <Select
                      aria-label="Filter by property"
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      options={[
                        { value: '', label: 'All properties' },
                        ...p.properties.map((x) => ({ value: String(x.id), label: x.name })),
                      ]}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[{ value: 'all', label: 'All' }, ...DOCUMENT_CATEGORIES.filter((c) => counts.get(c.value))].map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={category === c.value}
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      'h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap border inline-flex items-center gap-1.5',
                      category === c.value
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    )}
                  >
                    {c.label}
                    <span className={cn('tabular-nums text-[10px]', category === c.value ? 'text-white/70' : 'text-stone-400')}>
                      {c.value === 'all' ? p.documents.length : counts.get(c.value)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <DocumentList
            documents={list}
            emptyTitle={p.documents.length ? 'No documents match' : 'No documents yet'}
            emptyDescription={
              p.documents.length
                ? 'Try a different search or filter.'
                : 'Upload indentures, site plans, tenancy agreements and receipts — take a photo on your phone or pick a PDF.'
            }
            onUpload={p.documents.length ? undefined : () => setUploadOpen(true)}
          />
        </>
      )}
      <DocumentUploadForm open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  )
}

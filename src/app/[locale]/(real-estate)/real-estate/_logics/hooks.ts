'use client'

import { useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useAxios } from '@/hooks/use-axios'
import { apiErrorMessage } from '@/lib/api-error'
import { createApiSource, createLocalSource, DATA_SOURCE_KIND, type DataSource, type DocumentDraft } from './data-source'
import type { DocumentRecord, ResourceMap, ResourceName } from './types'

const RESOURCES: ResourceName[] = [
  'unitTypes',
  'properties',
  'units',
  'tenants',
  'leases',
  'payments',
  'bookings',
  'maintenance',
  'projects',
  'phases',
  'expenses',
  'documents',
]

export const useDataSource = (): { source: DataSource; ready: boolean; scope: string } => {
  const request = useAxios()
  const { data: session, status } = useSession()
  const scope = session?.user?.tenant || 'default'
  const source = useMemo(() => (DATA_SOURCE_KIND === 'local' ? createLocalSource(scope) : createApiSource(request)), [scope, request])
  // The API needs a signed-in, tenant-bound session; local data only needs the scope.
  return { source, ready: status === 'authenticated', scope }
}

export type Portfolio = { [R in ResourceName]: ResourceMap[R][] } & {
  isLoading: boolean
  error: string | null
  propertyById: Map<number, ResourceMap['properties']>
  unitById: Map<number, ResourceMap['units']>
  unitTypeById: Map<number, ResourceMap['unitTypes']>
  tenantById: Map<number, ResourceMap['tenants']>
}

// Every collection is small (a landlord's portfolio), so screens load them all
// and derive what they need. React Query shares and caches the requests.
export const usePortfolio = (): Portfolio => {
  const { source, ready, scope } = useDataSource()
  const results = useQueries({
    queries: RESOURCES.map((r) => ({
      queryKey: ['real-estate', source.kind, scope, r],
      queryFn: () => source.list(r),
      enabled: ready,
      staleTime: 30_000,
    })),
  })

  return useMemo(() => {
    const data = Object.fromEntries(RESOURCES.map((r, i) => [r, (results[i].data as unknown[]) ?? []])) as {
      [R in ResourceName]: ResourceMap[R][]
    }
    const failed = results.find((r) => r.error)
    return {
      ...data,
      isLoading: !ready || results.some((r) => r.isLoading),
      error: failed ? apiErrorMessage(failed.error, 'Couldn’t load your properties.') : null,
      propertyById: new Map(data.properties.map((p) => [p.id, p])),
      unitById: new Map(data.units.map((u) => [u.id, u])),
      unitTypeById: new Map(data.unitTypes.map((t) => [t.id, t])),
      tenantById: new Map(data.tenants.map((t) => [t.id, t])),
    }
    // results is a new array each render; its data/error identities are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, ...results.map((r) => r.data), ...results.map((r) => r.error)])
}

// Writes. Each call refreshes all real-estate data (cascades on delete touch
// several collections) and surfaces failures as a toast before rethrowing.
export const useRealEstateActions = () => {
  const { source, scope } = useDataSource()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['real-estate', source.kind, scope] })

  const run = async <T>(fn: () => Promise<T>, failMsg: string): Promise<T> => {
    try {
      const out = await fn()
      await refresh()
      return out
    } catch (err) {
      toast.error(apiErrorMessage(err, failMsg))
      throw err
    }
  }

  return {
    kind: source.kind,
    create: <R extends ResourceName>(r: R, body: Omit<ResourceMap[R], 'id'>) => run(() => source.create(r, body), 'Couldn’t save.'),
    // Sequential so generated unit names keep their order.
    createMany: <R extends ResourceName>(r: R, bodies: Omit<ResourceMap[R], 'id'>[]) =>
      run(async () => {
        const out: ResourceMap[R][] = []
        for (const b of bodies) out.push(await source.create(r, b))
        return out
      }, 'Couldn’t save.'),
    update: <R extends ResourceName>(r: R, id: number, body: Partial<Omit<ResourceMap[R], 'id'>>) =>
      run(() => source.update(r, id, body), 'Couldn’t save changes.'),
    remove: (r: ResourceName, id: number) => run(() => source.remove(r, id), 'Couldn’t delete.'),
    uploadDocument: (meta: DocumentDraft, file: File) => run(() => source.uploadDocument(meta, file), `Couldn’t upload ${file.name}.`),
    // Reads don't refresh anything; failures still toast.
    getFile: async (doc: DocumentRecord) => {
      try {
        return await source.getFile(doc)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Couldn’t open the file.'))
        throw err
      }
    },
    shareLink: (doc: DocumentRecord) => source.shareLink(doc).catch(() => null),
  }
}

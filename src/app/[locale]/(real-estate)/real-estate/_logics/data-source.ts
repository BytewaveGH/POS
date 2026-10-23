// Where real-estate data lives.
//
// - 'api'   — the Sellix backend (/real-estate/*, contract in BACKEND_REQUIREMENTS.md §6).
// - 'local' — this browser's localStorage, scoped per tenant. For using the
//             module before the backend ships; data does NOT sync between
//             devices and is lost if the browser's site data is cleared.
//
// Selected with NEXT_PUBLIC_REAL_ESTATE_DATA_SOURCE (default 'api').

import type { AxiosRequestConfig } from 'axios'
import { ALL_PRIVATE, ALL_SHARED, LEGACY_UNIT_TYPE_LABELS } from './constants'
import type { DocumentRecord, ResourceMap, ResourceName, Unit, UnitType } from './types'

export type DataSourceKind = 'api' | 'local'

export const DATA_SOURCE_KIND: DataSourceKind = process.env.NEXT_PUBLIC_REAL_ESTATE_DATA_SOURCE === 'local' ? 'local' : 'api'

type Draft<R extends ResourceName> = Omit<ResourceMap[R], 'id'>

export interface DataSource {
  kind: DataSourceKind
  list<R extends ResourceName>(resource: R): Promise<ResourceMap[R][]>
  create<R extends ResourceName>(resource: R, body: Draft<R>): Promise<ResourceMap[R]>
  update<R extends ResourceName>(resource: R, id: number, body: Partial<Draft<R>>): Promise<ResourceMap[R]>
  remove(resource: ResourceName, id: number): Promise<void>
  // Documents: metadata + the file itself.
  uploadDocument(meta: DocumentDraft, file: File): Promise<DocumentRecord>
  getFile(doc: DocumentRecord): Promise<Blob>
  // A time-limited link others can open (API only; local files can't be linked).
  shareLink(doc: DocumentRecord): Promise<string | null>
}

export type DocumentDraft = Omit<DocumentRecord, 'id' | 'uploadedAt' | 'fileName' | 'mimeType' | 'size'>

// ── API ──────────────────────────────────────────────────────────────────────

const PATHS: Record<ResourceName, string> = {
  unitTypes: 'unit-types',
  properties: 'properties',
  units: 'units',
  tenants: 'tenants',
  leases: 'leases',
  payments: 'payments',
  bookings: 'bookings',
  maintenance: 'maintenance',
  projects: 'projects',
  phases: 'project-phases',
  expenses: 'expenses',
  documents: 'documents',
}

export const RealEstateServices = {
  List: (resource: ResourceName): AxiosRequestConfig => ({ method: 'GET', url: `/real-estate/${PATHS[resource]}/` }),
  Create: (resource: ResourceName, data: unknown): AxiosRequestConfig => ({
    method: 'POST',
    url: `/real-estate/${PATHS[resource]}/`,
    data,
  }),
  Update: (resource: ResourceName, id: number, data: unknown): AxiosRequestConfig => ({
    method: 'PUT',
    url: `/real-estate/${PATHS[resource]}/${id}`,
    data,
  }),
  Delete: (resource: ResourceName, id: number): AxiosRequestConfig => ({ method: 'DELETE', url: `/real-estate/${PATHS[resource]}/${id}` }),
  UploadDocument: (form: FormData): AxiosRequestConfig => ({ method: 'POST', url: `/real-estate/documents/`, data: form }),
  DocumentFile: (id: number): AxiosRequestConfig => ({ method: 'GET', url: `/real-estate/documents/${id}/file`, responseType: 'blob' }),
  DocumentShareLink: (id: number): AxiosRequestConfig => ({ method: 'POST', url: `/real-estate/documents/${id}/share-link` }),
}

const unwrap = (res: any) => res?.data?.data ?? res?.data

export const createApiSource = (request: (c: AxiosRequestConfig) => Promise<any>): DataSource => ({
  kind: 'api',
  list: async (resource) => {
    const data = unwrap(await request(RealEstateServices.List(resource)))
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  },
  create: async (resource, body) => unwrap(await request(RealEstateServices.Create(resource, body))),
  update: async (resource, id, body) => unwrap(await request(RealEstateServices.Update(resource, id, body))),
  remove: async (resource, id) => {
    await request(RealEstateServices.Delete(resource, id))
  },
  uploadDocument: async (meta, file) => {
    const form = new FormData()
    form.append('file', file, file.name)
    for (const [k, v] of Object.entries(meta)) if (v !== undefined && v !== null && v !== '') form.append(k, String(v))
    return unwrap(await request(RealEstateServices.UploadDocument(form)))
  },
  getFile: async (doc) => (await request(RealEstateServices.DocumentFile(doc.id))).data as Blob,
  shareLink: async (doc) => unwrap(await request(RealEstateServices.DocumentShareLink(doc.id)))?.url ?? null,
})

// ── File storage for local mode (IndexedDB — localStorage is far too small) ──

export interface FileStore {
  put(key: string, blob: Blob): Promise<void>
  get(key: string): Promise<Blob | undefined>
  delete(key: string): Promise<void>
}

const idbRequest = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

export const createIndexedDbFileStore = (dbName = 'sellix-real-estate-files'): FileStore => {
  let db: Promise<IDBDatabase> | null = null
  const open = () => {
    db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore('files')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return db
  }
  const store = async (mode: IDBTransactionMode) => (await open()).transaction('files', mode).objectStore('files')
  return {
    put: async (key, blob) => {
      await idbRequest((await store('readwrite')).put(blob, key))
    },
    get: async (key) => (await idbRequest((await store('readonly')).get(key))) as Blob | undefined,
    delete: async (key) => {
      await idbRequest((await store('readwrite')).delete(key))
    },
  }
}

export const createMemoryFileStore = (): FileStore => {
  const m = new Map<string, Blob>()
  return { put: async (k, b) => void m.set(k, b), get: async (k) => m.get(k), delete: async (k) => void m.delete(k) }
}

// One shared store per page (one IndexedDB connection). Replaceable for tests
// and for environments without IndexedDB.
let sharedFileStore: FileStore | null | undefined
export const getLocalFileStore = (): FileStore | null => {
  if (sharedFileStore === undefined) sharedFileStore = typeof indexedDB === 'undefined' ? null : createIndexedDbFileStore()
  return sharedFileStore
}
export const setLocalFileStore = (store: FileStore | null) => {
  sharedFileStore = store
}

// ── Local (browser) ──────────────────────────────────────────────────────────

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const createLocalSource = (
  scope: string,
  storage: StorageLike | null = typeof window === 'undefined' ? null : window.localStorage,
  files: FileStore | null = getLocalFileStore()
): DataSource => {
  const fileKey = (id: number) => `${scope}:${id}`
  const key = (r: ResourceName) => `sellix-real-estate:${scope}:${r}`
  const read = <R extends ResourceName>(r: R): ResourceMap[R][] => {
    try {
      const raw = storage?.getItem(key(r))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  const write = (r: ResourceName, rows: unknown[]) => storage?.setItem(key(r), JSON.stringify(rows))
  const nextId = (rows: { id: number }[]) => rows.reduce((m, x) => Math.max(m, x.id), 0) + 1

  // Same shape as an axios error so callers handle local and API errors alike.
  const conflict = (message: string) =>
    Object.assign(new Error(message), { response: { status: 409, data: { status: false, error: message } } })

  // Units stored before room types were configurable carried a fixed `type`
  // plus `selfContained`/`bedrooms`. Turn each distinct combination into a
  // room type and point the units at it. Runs once; a no-op afterwards.
  const migrateLegacyUnits = () => {
    const units = read('units') as (Unit & Record<string, any>)[]
    const legacy = units.filter((u) => u.unitTypeId === undefined && typeof u.type === 'string')
    if (legacy.length === 0) return
    const types = read('unitTypes')
    const withHall = new Set(['chamber-and-hall', 'two-bedroom', 'three-bedroom', 'apartment', 'entire-home'])
    const migrated = units.map((u) => {
      if (!legacy.includes(u)) return u
      const base = LEGACY_UNIT_TYPE_LABELS[u.type] ?? 'Room'
      const name = u.rentalMode === 'short-stay' ? base : `${base} (${u.selfContained ? 'self-contained' : 'shared facilities'})`
      let t = types.find((x) => x.name === name)
      if (!t) {
        t = {
          id: nextId(types),
          name,
          bedrooms: Number(u.bedrooms ?? 1),
          livingRooms: withHall.has(u.type) ? 1 : 0,
          facilities: u.selfContained ? ALL_PRIVATE : ALL_SHARED,
          amenities: [],
          rentalMode: u.rentalMode,
          defaultMonthlyRent: u.monthlyRent ?? 0,
          defaultNightlyRate: u.nightlyRate ?? 0,
          maxGuests: u.maxGuests ?? 0,
        } satisfies UnitType
        types.push(t)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, selfContained, bedrooms, bathrooms, ...rest } = u
      return { ...rest, unitTypeId: t.id } as Unit
    })
    write('unitTypes', types)
    write('units', migrated)
  }
  try {
    migrateLegacyUnits()
  } catch {
    // Never block the app on a migration problem.
  }

  // Mirrors what the backend should do on delete (see BACKEND_REQUIREMENTS §6).
  const cascade = (resource: ResourceName, id: number) => {
    const dropWhere = <R extends ResourceName>(r: R, pred: (row: ResourceMap[R]) => boolean) => {
      const rows = read(r)
      const removed = rows.filter(pred)
      write(
        r,
        rows.filter((x) => !pred(x))
      )
      return removed
    }
    // Documents survive the deletion of what they were linked to, unlinked.
    const unlinkDocs = (field: 'unitId' | 'tenantId' | 'leaseId' | 'projectId') =>
      write(
        'documents',
        read('documents').map((d) => (d[field] === id ? { ...d, [field]: null } : d))
      )
    if (resource === 'properties') {
      const units = dropWhere('units', (u) => u.propertyId === id)
      dropWhere('maintenance', (m) => m.propertyId === id)
      units.forEach((u) => cascade('units', u.id))
      const projects = dropWhere('projects', (x) => x.propertyId === id)
      projects.forEach((x) => cascade('projects', x.id))
      dropWhere('expenses', (e) => e.propertyId === id)
      dropWhere('documents', (d) => d.propertyId === id).forEach((d) => void files?.delete(fileKey(d.id)))
    } else if (resource === 'units') {
      const leases = dropWhere('leases', (l) => l.unitId === id)
      dropWhere('bookings', (b) => b.unitId === id)
      leases.forEach((l) => cascade('leases', l.id))
      unlinkDocs('unitId')
    } else if (resource === 'leases') {
      dropWhere('payments', (p) => p.leaseId === id)
      unlinkDocs('leaseId')
    } else if (resource === 'tenants') {
      unlinkDocs('tenantId')
    } else if (resource === 'projects') {
      dropWhere('phases', (x) => x.projectId === id)
      dropWhere('expenses', (e) => e.projectId === id)
      unlinkDocs('projectId')
    } else if (resource === 'phases') {
      // Money spent stays on the project.
      write(
        'expenses',
        read('expenses').map((e) => (e.phaseId === id ? { ...e, phaseId: null } : e))
      )
    } else if (resource === 'documents') {
      void files?.delete(fileKey(id))
      write(
        'expenses',
        read('expenses').map((e) => (e.documentId === id ? { ...e, documentId: null } : e))
      )
    }
  }

  return {
    kind: 'local',
    list: async (resource) => read(resource),
    create: async (resource, body) => {
      const rows = read(resource)
      const row = { ...(body as object), id: nextId(rows as { id: number }[]) } as ResourceMap[typeof resource]
      write(resource, [...rows, row])
      return row
    },
    update: async (resource, id, body) => {
      const rows = read(resource)
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) throw new Error('Not found')
      const row = { ...rows[idx], ...(body as object), id } as ResourceMap[typeof resource]
      rows[idx] = row
      write(resource, rows)
      return row
    },
    remove: async (resource, id) => {
      if (resource === 'unitTypes') {
        const used = read('units').filter((u) => u.unitTypeId === id).length
        if (used > 0) throw conflict(`This room type is used by ${used} unit${used === 1 ? '' : 's'}. Change their type first.`)
      }
      write(
        resource,
        read(resource).filter((r) => r.id !== id)
      )
      cascade(resource, id)
    },
    uploadDocument: async (meta, file) => {
      if (!files) throw new Error('File storage isn’t available in this browser')
      const rows = read('documents')
      const doc: DocumentRecord = {
        ...meta,
        id: nextId(rows),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }
      await files.put(fileKey(doc.id), file)
      write('documents', [...rows, doc])
      return doc
    },
    getFile: async (doc) => {
      const blob = await files?.get(fileKey(doc.id))
      if (!blob) throw new Error('This file isn’t stored in this browser')
      return blob
    },
    shareLink: async () => null,
  }
}

import {
  expenseAmount,
  phasesFromNames,
  projectSummary,
  propertyInvestment,
  spendByCategory,
  spendByMonth,
} from '@/app/[locale]/(real-estate)/real-estate/_logics/development'
import { fileProblem, toWhatsAppNumber, whatsAppLink } from '@/app/[locale]/(real-estate)/real-estate/_logics/share'
import { createLocalSource, createMemoryFileStore } from '@/app/[locale]/(real-estate)/real-estate/_logics/data-source'
import type { Expense, Project, ProjectPhase, Property } from '@/app/[locale]/(real-estate)/real-estate/_logics/types'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

const land: Property = {
  id: 1,
  name: 'Plot at Abuakwa',
  type: 'land',
  address: 'Abuakwa',
  city: 'Kumasi',
  purchasePrice: 45000,
  land: { size: 1, sizeUnit: 'plots', stage: 'fenced', titleStatus: 'indenture' },
}
const project: Project = { id: 1, propertyId: 1, name: '3-bedroom house', status: 'in-progress', budget: 100000 }
const phase = (id: number, position: number, status: ProjectPhase['status'], budget = 0): ProjectPhase => ({
  id,
  projectId: 1,
  name: `Phase ${id}`,
  position,
  status,
  budget,
})
const expense = (over: Partial<Expense>): Expense => ({
  id: Math.random(),
  propertyId: 1,
  category: 'materials',
  description: 'x',
  amount: 0,
  date: '2026-10-01',
  ...over,
})

describe('development money', () => {
  it('expense amount is quantity × unit cost, else the amount', () => {
    expect(expenseAmount({ quantity: 200, unitCost: 95, amount: 0 })).toBe(19000)
    expect(expenseAmount({ amount: 1500 })).toBe(1500)
    expect(expenseAmount({ quantity: 3, unitCost: 0.1, amount: 0 })).toBe(0.3)
  })

  it('summarises a project by phase, budget and progress', () => {
    const phases = [phase(2, 2, 'in-progress', 30000), phase(1, 1, 'done', 10000), phase(3, 3, 'not-started')]
    const s = projectSummary(project, phases, [
      expense({ projectId: 1, phaseId: 1, quantity: 100, unitCost: 95 }),
      expense({ projectId: 1, phaseId: 2, amount: 40000, category: 'labour' }),
      expense({ projectId: 1, amount: 500, category: 'transport' }),
      expense({ projectId: 2, amount: 99999 }),
    ])
    expect(s.spent).toBe(50000)
    expect(s.remaining).toBe(50000)
    expect(s.overBudget).toBe(false)
    expect(s.phases.map((p) => p.phase.id)).toEqual([1, 2, 3])
    expect(s.phases[0]).toMatchObject({ spent: 9500, expenseCount: 1 })
    expect(s.phases[1].usage).toBeCloseTo(40000 / 30000)
    expect(s.unphasedSpent).toBe(500)
    expect(s).toMatchObject({ doneCount: 1, phaseCount: 3 })
    expect(s.progress).toBeCloseTo(1 / 3)
    expect(s.currentPhase?.id).toBe(2)
  })

  it('flags a project that went over budget', () => {
    expect(projectSummary({ ...project, budget: 1000 }, [], [expense({ projectId: 1, amount: 1200 })]).overBudget).toBe(true)
    expect(projectSummary({ ...project, budget: 0 }, [], [expense({ projectId: 1, amount: 1200 })]).overBudget).toBe(false)
  })

  it('total invested = land price + expenses + repairs on that property only', () => {
    const inv = propertyInvestment(
      land,
      [expense({ amount: 12000 }), expense({ quantity: 10, unitCost: 100 }), expense({ propertyId: 2, amount: 5000 })],
      [{ id: 1, propertyId: 1, title: 'Gate', priority: 'low', status: 'resolved', cost: 300, reportedOn: '2026-09-01' }]
    )
    expect(inv).toEqual({ purchase: 45000, development: 13000, repairs: 300, total: 58300 })
  })

  it('groups spending by category, largest first, and by month', () => {
    const list = [
      expense({ amount: 100, category: 'labour' }),
      expense({ amount: 300 }),
      expense({ amount: 50, category: 'labour', date: '2026-08-15' }),
    ]
    expect(spendByCategory(list).map((c) => [c.category, c.amount])).toEqual([
      ['materials', 300],
      ['labour', 150],
    ])
    const months = spendByMonth(list, new Date(2026, 9, 23), 3)
    expect(months.map((m) => [m.key, m.value])).toEqual([
      ['2026-08', 50],
      ['2026-09', 0],
      ['2026-10', 400],
    ])
  })

  it('a fenced plot starts with documentation, clearing and fencing done', () => {
    const phases = phasesFromNames(['Land documentation', 'Site clearing', 'Fencing', 'Foundation', ' ', 'Roofing'], 7, 'fenced')
    expect(phases.map((p) => [p.name, p.position, p.status])).toEqual([
      ['Land documentation', 1, 'done'],
      ['Site clearing', 2, 'done'],
      ['Fencing', 3, 'done'],
      ['Foundation', 4, 'not-started'],
      ['Roofing', 5, 'not-started'],
    ])
    expect(phases.every((p) => p.projectId === 7)).toBe(true)
    expect(phasesFromNames(['Fencing'], 1, 'bare')[0].status).toBe('not-started')
  })
})

describe('sharing', () => {
  it('normalises Ghana numbers for WhatsApp', () => {
    expect(toWhatsAppNumber('024 123 4567')).toBe('233241234567')
    expect(toWhatsAppNumber('+233 24 123 4567')).toBe('233241234567')
    expect(toWhatsAppNumber('00233241234567')).toBe('233241234567')
    expect(toWhatsAppNumber('241234567')).toBe('233241234567')
    expect(toWhatsAppNumber('12345')).toBeNull()
    expect(toWhatsAppNumber(undefined)).toBeNull()
  })

  it('builds a wa.me link with the encoded message', () => {
    expect(whatsAppLink('Tenancy agreement & receipt', '0241234567')).toBe(
      'https://wa.me/233241234567?text=Tenancy%20agreement%20%26%20receipt'
    )
    expect(whatsAppLink('Hi')).toBe('https://wa.me/?text=Hi')
  })

  it('rejects files that are too big or of the wrong type', () => {
    expect(fileProblem({ name: 'indenture.pdf', type: 'application/pdf', size: 1000 })).toBeNull()
    expect(fileProblem({ name: 'IMG_1.HEIC', type: '', size: 1000 })).toBeNull()
    expect(fileProblem({ name: 'big.pdf', type: 'application/pdf', size: 16 * 1024 * 1024 })).toMatch(/15 MB/)
    expect(fileProblem({ name: 'run.exe', type: 'application/x-msdownload', size: 10 })).toMatch(/PDF, photo or Word/)
  })
})

describe('local documents, projects and cascades', () => {
  const setup = async () => {
    const files = createMemoryFileStore()
    const s = createLocalSource('acme', memory(), files)
    const plot = await s.create('properties', { name: 'Plot', type: 'land', address: 'x', city: 'y', purchasePrice: 45000 })
    const p = await s.create('projects', { propertyId: plot.id, name: 'House', status: 'in-progress', budget: 0 })
    const ph = await s.create('phases', { projectId: p.id, name: 'Foundation', position: 1, status: 'not-started', budget: 0 })
    const file = new File(['receipt bytes'], 'receipt.jpg', { type: 'image/jpeg' })
    const doc = await s.uploadDocument({ title: 'Cement receipt', category: 'receipt', projectId: p.id }, file)
    const e = await s.create('expenses', {
      propertyId: plot.id,
      projectId: p.id,
      phaseId: ph.id,
      category: 'materials',
      description: 'Cement',
      quantity: 200,
      unitCost: 95,
      amount: 19000,
      date: '2026-10-01',
      documentId: doc.id,
    })
    return { s, files, file, plot, p, ph, doc, e }
  }

  it('stores the file and its details, and gives the file back', async () => {
    const { s, doc, file } = await setup()
    expect(doc).toMatchObject({ id: 1, fileName: 'receipt.jpg', mimeType: 'image/jpeg', size: 13, category: 'receipt' })
    expect(await s.getFile(doc)).toBe(file)
    expect(await s.shareLink(doc)).toBeNull()
  })

  it('deleting a phase keeps its spending on the project', async () => {
    const { s, ph } = await setup()
    await s.remove('phases', ph.id)
    const [e] = await s.list('expenses')
    expect(e.phaseId).toBeNull()
    expect(e.projectId).toBe(1)
  })

  it('deleting a project removes phases and expenses but keeps its documents, unlinked', async () => {
    const { s, p, doc, file } = await setup()
    await s.remove('projects', p.id)
    expect(await s.list('phases')).toEqual([])
    expect(await s.list('expenses')).toEqual([])
    const [d] = await s.list('documents')
    expect(d.projectId).toBeNull()
    expect(await s.getFile(doc)).toBe(file)
  })

  it('deleting a document removes its file and the receipt link', async () => {
    const { s, doc } = await setup()
    await s.remove('documents', doc.id)
    await expect(s.getFile(doc)).rejects.toThrow(/isn’t stored/)
    expect((await s.list('expenses'))[0].documentId).toBeNull()
  })

  it('deleting a tenant keeps their tenancy agreement, unlinked', async () => {
    const { s } = await setup()
    const t = await s.create('tenants', { fullName: 'Ama', phone: '0241234567' })
    const d = await s.uploadDocument(
      { title: 'Agreement', category: 'tenancy-agreement', tenantId: t.id },
      new File(['a'], 'a.pdf', { type: 'application/pdf' })
    )
    await s.remove('tenants', t.id)
    expect((await s.list('documents')).find((x) => x.id === d.id)?.tenantId).toBeNull()
  })

  it('deleting the land removes its projects, expenses, documents and files', async () => {
    const { s, files, plot, doc } = await setup()
    const own = await s.uploadDocument(
      { title: 'Indenture', category: 'indenture', propertyId: plot.id },
      new File(['i'], 'i.pdf', { type: 'application/pdf' })
    )
    await s.remove('properties', plot.id)
    expect(await s.list('projects')).toEqual([])
    expect(await s.list('phases')).toEqual([])
    expect(await s.list('expenses')).toEqual([])
    expect((await s.list('documents')).map((d) => d.id)).toEqual([doc.id])
    expect(await files.get(`acme:${own.id}`)).toBeUndefined()
  })
})

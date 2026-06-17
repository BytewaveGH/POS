'use client'

import React, { useState } from 'react'
import { Users, Shield, Trash2, Edit2, UserCog, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SheetTemplate } from '@/components/templates/sheet'
import ButtonTemplate from '@/components/templates/button'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { EmployeeServices } from '../_logics/services'
import CreateEmployee, { PERMISSIONS } from './_forms/create-employee'
import { IGeneric } from '@/types/interfaces'

const AVATAR_COLORS = ['bg-endeavour', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600']

const initials = (name: string) =>
  (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

// ── Employee card ────────────────────────────────────────────────────────────
const EmployeeCard = ({ emp, colorIdx, onEdit, onDelete }: { emp: any; colorIdx: number; onEdit: () => void; onDelete: () => void }) => {
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const enabled = PERMISSIONS.filter((p) => emp[p.key])
  const disabled = PERMISSIONS.filter((p) => !emp[p.key])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-endeavour/30 hover:shadow-sm transition-all">
      {/* Top section */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
              AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]
            )}
          >
            {initials(emp.name ?? emp.username ?? '')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate leading-tight">{emp.name}</p>
            <p className="text-xs text-gray-400 truncate">@{emp.username}</p>
            <p className="text-xs text-gray-400 truncate">{emp.email}</p>
            {emp.phone && <p className="text-xs text-gray-400 truncate">{emp.phone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {confirmingDelete ? (
            <>
              <button
                onClick={() => {
                  onDelete()
                  setConfirmingDelete(false)
                }}
                className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold active:scale-95 transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-2 py-1 rounded-lg border border-gray-200 text-gray-500 text-[11px] active:scale-95 transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="p-2 rounded-xl text-gray-400 hover:text-endeavour hover:bg-endeavour/5 active:scale-90 transition-all"
                title="Edit employee"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
                title="Delete employee"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Permissions section */}
      <div className="border-t border-gray-50 px-4 pb-3 pt-2.5">
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center justify-between w-full mb-2 group">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Permissions</span>
            <span
              className={cn(
                'text-[10px] font-bold rounded-full px-1.5 py-0.5',
                enabled.length > 0 ? 'bg-endeavour/10 text-endeavour' : 'bg-gray-100 text-gray-400'
              )}
            >
              {enabled.length}/{PERMISSIONS.length}
            </span>
          </div>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </button>

        {/* Enabled permissions (always visible as chips) */}
        {enabled.length === 0 ? (
          <p className="text-xs text-gray-300 italic">No permissions assigned</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {enabled.map((p) => (
              <span key={p.key} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', p.color)}>
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* Expandable: show disabled permissions too */}
        {expanded && disabled.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {disabled.map((p) => (
              <span key={p.key} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 line-through">
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
const Main = () => {
  const request = useAxios()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const { data: employeesRaw, isLoading, refetch } = useFetchData('employees', EmployeeServices.FetchAll() as unknown as IGeneric)
  const employees: any[] = (employeesRaw as any[]) ?? []

  const fullAccessCount = employees.filter((e) => PERMISSIONS.every((p) => e[p.key])).length
  const totalPerms = employees.reduce((s, e) => s + PERMISSIONS.filter((p) => e[p.key]).length, 0)
  const avgPerms = employees.length > 0 ? (totalPerms / employees.length).toFixed(1) : '—'

  const openCreate = () => {
    setSelected(null)
    setModalOpen(true)
  }
  const openEdit = (emp: any) => {
    setSelected(emp)
    setModalOpen(true)
  }
  const handleClose = () => {
    setModalOpen(false)
    setSelected(null)
  }

  const handleDelete = async (id: number) => {
    try {
      await request(EmployeeServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Sheet */}
      <SheetTemplate
        open={modalOpen}
        handleOpen={() => setModalOpen(true)}
        handleClose={handleClose}
        title={selected ? 'Edit Employee' : 'Add Employee'}
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[40rem]"
        content={
          <CreateEmployee
            mode={selected ? 'update' : 'create'}
            employeeId={selected?.id}
            initialData={selected ?? undefined}
            onSuccess={() => {
              refetch()
              handleClose()
            }}
          />
        }
      />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="bytewave-heading">Employees</h1>
          <p className="bytewave-paragraph text-gray-500">Manage staff accounts and access permissions</p>
        </div>
        <ButtonTemplate
          isText
          text="Add Employee"
          classname="px-4 py-2 bg-endeavour text-white rounded-xl w-fit text-sm"
          handleClick={openCreate}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Total Employees</p>
            <div className="p-1.5 rounded-lg bg-endeavour">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-2xl text-stone-800">{isLoading ? '—' : employees.length}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Active accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Full Access</p>
            <div className="p-1.5 rounded-lg bg-purple-500">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-2xl text-stone-800">{isLoading ? '—' : fullAccessCount}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">All permissions on</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Avg Permissions</p>
            <div className="p-1.5 rounded-lg bg-amber-500">
              <UserCog className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-2xl text-stone-800">{isLoading ? '—' : avgPerms}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Per employee</p>
        </div>
      </div>

      {/* Employee list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse h-44" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Users className="h-10 w-10 opacity-30" />
          <p className="bytewave-paragraph text-sm">No employees yet.</p>
          <ButtonTemplate
            isText
            text="Add your first employee"
            classname="px-4 py-2 bg-endeavour text-white rounded-xl text-sm mt-1"
            handleClick={openCreate}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {employees.map((emp: any, idx: number) => (
            <EmployeeCard key={emp.id} emp={emp} colorIdx={idx} onEdit={() => openEdit(emp)} onDelete={() => handleDelete(emp.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Main

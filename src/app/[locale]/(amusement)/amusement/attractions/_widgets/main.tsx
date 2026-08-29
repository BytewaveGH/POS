'use client'

import React, { useMemo, useState } from 'react'
import ButtonTemplate from '@/components/templates/button'
import DatagridTemplate from '@/components/templates/datagrid'
import { SheetTemplate } from '@/components/templates/sheet'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { IGeneric } from '@/types/interfaces'
import { Wrench } from 'lucide-react'
import CreateAttraction from './_forms/create-attraction'
import { AttractionServices } from '../_logics/services'
import { attractionTypeLabel, attractionTypeColor, attractionTypeIcon } from '../_logics/attraction-types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
}

const Main = () => {
  const request = useAxios()

  const [states, setStates] = useState<{ isModalOpen: boolean; selectedAttraction: any | null }>({
    isModalOpen: false,
    selectedAttraction: null,
  })

  const { data: attractions, isLoading, refetch } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const handleDelete = async (id: number) => {
    try {
      await request(AttractionServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Delete attraction failed:', err)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 80 },
      {
        field: 'name',
        headerName: 'Attraction',
        flex: 1,
        cellRenderer: ({ data }: any) => {
          const Icon = attractionTypeIcon(data?.type)
          return (
            <div className="flex items-center gap-2 h-full">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${attractionTypeColor(data?.type)}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">{data?.name}</span>
              <span title="Custom-built attraction" className="flex-shrink-0">
                <Wrench className="h-3 w-3 text-gray-300" aria-label="Custom-built attraction" />
              </span>
            </div>
          )
        },
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 160,
        cellRenderer: ({ value }: any) => (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${attractionTypeColor(value)}`}>{attractionTypeLabel(value)}</span>
        ),
      },
      { field: 'capacity', headerName: 'Capacity', width: 110 },
      {
        field: 'ticketPrice',
        headerName: 'Ticket Price',
        width: 130,
        valueFormatter: ({ value }: any) => `₵${Number(value ?? 0).toFixed(2)}`,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        cellRenderer: ({ value }: any) => (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[value] ?? 'bg-gray-100 text-gray-500'}`}
          >
            {value ?? 'active'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: any) => (
          <div className="flex items-center gap-1 h-full">
            <button
              className="text-xs text-endeavour hover:underline"
              onClick={() => setStates((s) => ({ ...s, selectedAttraction: data, isModalOpen: true }))}
            >
              Edit
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(data.id)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="w-full h-full">
      <SheetTemplate
        open={states.isModalOpen}
        handleOpen={() => setStates((s) => ({ ...s, isModalOpen: true }))}
        handleClose={() => setStates((s) => ({ ...s, isModalOpen: false, selectedAttraction: null }))}
        title={states.selectedAttraction ? 'Edit Attraction' : 'Add Attraction'}
        contentBodyClassName="flex flex-col"
        content={
          <CreateAttraction
            mode={states.selectedAttraction ? 'update' : 'create'}
            attractionId={states.selectedAttraction?.id}
            initialData={states.selectedAttraction ?? undefined}
            onSuccess={() => {
              refetch()
              setStates((s) => ({ ...s, isModalOpen: false, selectedAttraction: null }))
            }}
          />
        }
      />

      <nav className="w-full">
        <aside className="w-full flex justify-between items-center p-4">
          <div>
            <h2 className="bytewave-heading text-base">Attractions</h2>
            <p className="bytewave-paragraph text-xs">Manage rides, attractions, and their capacity</p>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Wrench className="h-3 w-3" /> Every attraction here is custom-built for your park
            </p>
          </div>
          <ButtonTemplate
            isText
            text="Add Attraction"
            handleClick={() => setStates((s) => ({ ...s, selectedAttraction: null, isModalOpen: true }))}
          />
        </aside>
      </nav>
      <div className="overflow-x-auto">
        <DatagridTemplate
          columns={columns}
          data={(attractions as unknown as any[]) ?? []}
          loadingIndicator={isLoading}
          enablePagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50]}
          selectionType="singleRow"
        />
      </div>
    </div>
  )
}

export default Main

'use client'

import React, { useMemo, useState } from 'react'
import ButtonTemplate from '@/components/templates/button'
import DatagridTemplate from '@/components/templates/datagrid'
import { SheetTemplate } from '@/components/templates/sheet'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { IGeneric } from '@/types/interfaces'
import CreateTicket from './_forms/create-ticket'
import { TicketServices } from '../_logics/services'
import { AttractionServices } from '../../attractions/_logics/services'
import { attractionTypeLabel } from '../../attractions/_logics/attraction-types'

const STATUS_STYLES: Record<string, string> = {
  valid: 'bg-green-100 text-green-700',
  redeemed: 'bg-gray-100 text-gray-500',
}

const Main = () => {
  const request = useAxios()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: tickets, isLoading, refetch } = useFetchData('tickets', TicketServices.FetchAll() as unknown as IGeneric)
  const { data: attractions } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const findAttraction = (attractionId: number | null | undefined) =>
    ((attractions as unknown as any[]) ?? []).find((a) => a.id === attractionId)
  const attractionName = (attractionId: number | null | undefined) => findAttraction(attractionId)?.name ?? 'General Admission'

  const handleRedeem = async (id: number) => {
    try {
      await request(TicketServices.Redeem(id))
      refetch()
    } catch (err) {
      console.error('Redeem ticket failed:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await request(TicketServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Void ticket failed:', err)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 80 },
      {
        field: 'attractionId',
        headerName: 'Attraction',
        flex: 1,
        valueGetter: ({ data }: any) => attractionName(data?.attractionId),
      },
      {
        field: 'attractionType',
        headerName: 'Type',
        width: 130,
        valueFormatter: ({ value }: any) => value || '—',
        valueGetter: ({ data }: any) => {
          const attraction = findAttraction(data?.attractionId)
          return attraction ? attractionTypeLabel(attraction.type) : ''
        },
      },
      { field: 'buyerName', headerName: 'Buyer', flex: 1, valueFormatter: ({ value }: any) => value || '—' },
      { field: 'quantity', headerName: 'Qty', width: 90 },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: ({ value }: any) => (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[value] ?? 'bg-green-100 text-green-700'}`}
          >
            {value ?? 'valid'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 150,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: any) => (
          <div className="flex items-center gap-1 h-full">
            {data.status !== 'redeemed' && (
              <>
                <button className="text-xs text-endeavour hover:underline" onClick={() => handleRedeem(data.id)}>
                  Redeem
                </button>
                <span className="text-gray-300">|</span>
              </>
            )}
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(data.id)}>
              Void
            </button>
          </div>
        ),
      },
    ],
    [attractions]
  )

  return (
    <div className="w-full h-full">
      <SheetTemplate
        open={isModalOpen}
        handleOpen={() => setIsModalOpen(true)}
        handleClose={() => setIsModalOpen(false)}
        title="Sell Ticket"
        contentBodyClassName="flex flex-col"
        content={
          <CreateTicket
            onSuccess={() => {
              refetch()
              setIsModalOpen(false)
            }}
          />
        }
      />

      <nav className="w-full">
        <aside className="w-full flex justify-between items-center p-4">
          <div>
            <h2 className="bytewave-heading text-base">Tickets</h2>
            <p className="bytewave-paragraph text-xs">Sell and validate entry and ride tickets</p>
          </div>
          <ButtonTemplate isText text="Sell Ticket" handleClick={() => setIsModalOpen(true)} />
        </aside>
      </nav>
      <div className="overflow-x-auto">
        <DatagridTemplate
          columns={columns}
          data={(tickets as unknown as any[]) ?? []}
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

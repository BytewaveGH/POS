'use client'

import React, { useMemo, useState } from 'react'
import ButtonTemplate from '@/components/templates/button'
import DatagridTemplate from '@/components/templates/datagrid'
import { SheetTemplate } from '@/components/templates/sheet'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { IGeneric } from '@/types/interfaces'
import CreateBooking from './_forms/create-booking'
import { BookingServices } from '../_logics/services'
import { AttractionServices } from '../../attractions/_logics/services'
import { attractionTypeLabel } from '../../attractions/_logics/attraction-types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const Main = () => {
  const request = useAxios()
  const [states, setStates] = useState<{ isModalOpen: boolean; selectedBooking: any | null }>({
    isModalOpen: false,
    selectedBooking: null,
  })

  const { data: bookings, isLoading, refetch } = useFetchData('bookings', BookingServices.FetchAll() as unknown as IGeneric)
  const { data: attractions } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const findAttraction = (attractionId: number | null | undefined) =>
    ((attractions as unknown as any[]) ?? []).find((a) => a.id === attractionId)
  const attractionName = (attractionId: number | null | undefined) => findAttraction(attractionId)?.name ?? 'General visit'

  const handleSetStatus = async (booking: any, status: 'confirmed' | 'cancelled') => {
    try {
      await request(BookingServices.Update(booking.id, { ...booking, status }))
      refetch()
    } catch (err) {
      console.error('Update booking status failed:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await request(BookingServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Delete booking failed:', err)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 80 },
      { field: 'customerName', headerName: 'Customer', flex: 1 },
      { field: 'date', headerName: 'Date', width: 130 },
      { field: 'partySize', headerName: 'Party', width: 90 },
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
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: ({ value }: any) => (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[value] ?? 'bg-amber-100 text-amber-700'}`}>
            {value ?? 'pending'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 220,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: any) => (
          <div className="flex items-center gap-1 h-full">
            {data.status !== 'confirmed' && (
              <button className="text-xs text-green-600 hover:underline" onClick={() => handleSetStatus(data, 'confirmed')}>
                Confirm
              </button>
            )}
            {data.status !== 'cancelled' && (
              <button className="text-xs text-amber-600 hover:underline" onClick={() => handleSetStatus(data, 'cancelled')}>
                Cancel
              </button>
            )}
            <button
              className="text-xs text-endeavour hover:underline"
              onClick={() => setStates((s) => ({ ...s, selectedBooking: data, isModalOpen: true }))}
            >
              Edit
            </button>
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(data.id)}>
              Delete
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
        open={states.isModalOpen}
        handleOpen={() => setStates((s) => ({ ...s, isModalOpen: true }))}
        handleClose={() => setStates((s) => ({ ...s, isModalOpen: false, selectedBooking: null }))}
        title={states.selectedBooking ? 'Edit Booking' : 'Add Booking'}
        contentBodyClassName="flex flex-col"
        content={
          <CreateBooking
            mode={states.selectedBooking ? 'update' : 'create'}
            bookingId={states.selectedBooking?.id}
            initialData={
              states.selectedBooking
                ? { ...states.selectedBooking, attractionId: states.selectedBooking.attractionId?.toString() ?? '' }
                : undefined
            }
            onSuccess={() => {
              refetch()
              setStates((s) => ({ ...s, isModalOpen: false, selectedBooking: null }))
            }}
          />
        }
      />

      <nav className="w-full">
        <aside className="w-full flex justify-between items-center p-4">
          <div>
            <h2 className="bytewave-heading text-base">Bookings</h2>
            <p className="bytewave-paragraph text-xs">Track group bookings and reservations</p>
          </div>
          <ButtonTemplate
            isText
            text="Add Booking"
            handleClick={() => setStates((s) => ({ ...s, selectedBooking: null, isModalOpen: true }))}
          />
        </aside>
      </nav>
      <div className="overflow-x-auto">
        <DatagridTemplate
          columns={columns}
          data={(bookings as unknown as any[]) ?? []}
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

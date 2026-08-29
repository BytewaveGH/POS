'use client'

import React, { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import ButtonTemplate from '@/components/templates/button'
import DatagridTemplate from '@/components/templates/datagrid'
import { SheetTemplate } from '@/components/templates/sheet'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { IGeneric } from '@/types/interfaces'
import CreateLeaderboardEntry from './_forms/create-leaderboard-entry'
import { LeaderboardServices } from '../_logics/services'
import { AttractionServices } from '../../attractions/_logics/services'
import { attractionMetric } from '../../attractions/_logics/attraction-types'

const Main = () => {
  const request = useAxios()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: entries, isLoading, refetch } = useFetchData('leaderboard', LeaderboardServices.FetchAll() as unknown as IGeneric)
  const { data: attractions } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const findAttraction = (attractionId: number | null | undefined) =>
    ((attractions as unknown as any[]) ?? []).find((a) => a.id === attractionId)

  const handleDelete = async (id: number) => {
    try {
      await request(LeaderboardServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Delete leaderboard entry failed:', err)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 80 },
      {
        field: 'attractionId',
        headerName: 'Attraction',
        flex: 1,
        valueGetter: ({ data }: any) => findAttraction(data?.attractionId)?.name ?? '—',
      },
      { field: 'participantName', headerName: 'Participant', flex: 1 },
      { field: 'teamName', headerName: 'Team', flex: 1, valueFormatter: ({ value }: any) => value || '—' },
      {
        field: 'score',
        headerName: 'Score',
        width: 150,
        valueGetter: ({ data }: any) => {
          const metric = attractionMetric(findAttraction(data?.attractionId)?.type)
          return `${data?.score ?? 0}${metric.unit ? ` ${metric.unit}` : ''}`
        },
      },
      { field: 'achievedAt', headerName: 'Date', width: 130 },
      {
        field: 'actions',
        headerName: '',
        width: 90,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: any) => (
          <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(data.id)}>
            Delete
          </button>
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
        title="Add Leaderboard Entry"
        contentBodyClassName="flex flex-col"
        content={
          <CreateLeaderboardEntry
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
            <h2 className="bytewave-heading text-base">Leaderboard</h2>
            <p className="bytewave-paragraph text-xs">Record top scores/times per attraction</p>
          </div>
          <ButtonTemplate isText text="Add Entry" handleClick={() => setIsModalOpen(true)} />
        </aside>
      </nav>

      <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-endeavour/5 border border-endeavour/10">
        <ExternalLink className="h-3.5 w-3.5 text-endeavour flex-shrink-0" />
        <p className="text-xs text-stone-600">
          Public display (no login needed) —{' '}
          <a href="/en/amusement/board" target="_blank" rel="noreferrer" className="text-endeavour underline underline-offset-2">
            /en/amusement/board
          </a>{' '}
          — put this up on a lobby screen or share the link.
        </p>
      </div>

      <div className="overflow-x-auto">
        <DatagridTemplate
          columns={columns}
          data={(entries as unknown as any[]) ?? []}
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

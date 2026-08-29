'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { publicApiClient } from '@/lib/public-axios-client'
import {
  attractionTypeIcon,
  attractionTypeColor,
  attractionTypeLabel,
  attractionMetric,
} from '@/app/[locale]/(amusement)/amusement/attractions/_logics/attraction-types'

type RawEntry = {
  id: number
  attractionId: number
  attractionName: string
  attractionType: string
  participantName: string
  teamName?: string | null
  score: number
  achievedAt: string
}

const REFRESH_MS = 30_000
const TOP_N = 10

export default function LeaderboardBoard() {
  const [entries, setEntries] = useState<RawEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await publicApiClient.get('/leaderboard/public')
      setEntries(res.data?.data ?? [])
      setError('')
    } catch (err) {
      console.error('Failed to load public leaderboard:', err)
      setError('Could not load the leaderboard right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  const boards = new Map<number, { name: string; type: string; rows: RawEntry[] }>()
  entries.forEach((e) => {
    if (!boards.has(e.attractionId)) boards.set(e.attractionId, { name: e.attractionName, type: e.attractionType, rows: [] })
    boards.get(e.attractionId)!.rows.push(e)
  })
  boards.forEach((board) => {
    const { higherIsBetter } = attractionMetric(board.type)
    board.rows.sort((a, b) => (higherIsBetter ? b.score - a.score : a.score - b.score))
    board.rows = board.rows.slice(0, TOP_N)
  })

  return (
    <div className="min-h-screen text-white px-6 py-10 md:px-12">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <Trophy className="h-8 w-8 text-amber-400" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Park Leaderboard</h1>
      </div>

      {isLoading ? (
        <p className="text-center text-white/50">Loading…</p>
      ) : error ? (
        <p className="text-center text-red-400">{error}</p>
      ) : boards.size === 0 ? (
        <p className="text-center text-white/50">No scores recorded yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {Array.from(boards.values()).map((board) => {
            const Icon = attractionTypeIcon(board.type)
            const metric = attractionMetric(board.type)
            return (
              <div key={board.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${attractionTypeColor(board.type)}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">{board.name}</p>
                    <p className="text-[11px] text-white/40">{attractionTypeLabel(board.type)}</p>
                  </div>
                </div>
                <ol className="flex flex-col gap-2">
                  {board.rows.map((row, i) => (
                    <li key={row.id} className="flex items-center gap-3 text-sm">
                      <span
                        className={`w-6 text-center font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-white/30'}`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate">
                        {row.participantName}
                        {row.teamName && <span className="text-white/40"> · {row.teamName}</span>}
                      </span>
                      <span className="font-mono font-semibold text-white/90">
                        {row.score}
                        {metric.unit ? ` ${metric.unit}` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

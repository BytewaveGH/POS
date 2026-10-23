'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, CornerDownLeft, LayoutDashboard, Plus, Search, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { filterTenants } from '../_logics/insights'
import { useTenants } from '../_logics/api'
import { AppAvatar, StatusPill } from './bits'

type Item = { id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }

// ⌘K / Ctrl+K: jump to any app or action by typing.
export const CommandPalette = ({ base, onNewApp }: { base: string; onNewApp: () => void }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const router = useRouter()
  const { data: tenants = [] } = useTenants()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    const onOpen = () => setOpen(true)
    window.addEventListener('open-command-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const go = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  const items: Item[] = useMemo(() => {
    const actions: Item[] = [
      { id: 'new', label: 'Register a new app', icon: <Plus className="h-4 w-4" />, run: go(onNewApp) },
      { id: 'overview', label: 'Go to Overview', icon: <LayoutDashboard className="h-4 w-4" />, run: go(() => router.push(base)) },
      { id: 'apps', label: 'Go to Apps', icon: <Store className="h-4 w-4" />, run: go(() => router.push(`${base}/apps`)) },
    ]
    const apps: Item[] = filterTenants(tenants, { query, sort: 'name' })
      .slice(0, 8)
      .map((t) => ({
        id: `app-${t.id}`,
        label: t.name,
        hint: `${t.slug} · ${t.ownerEmail}`,
        icon: <AppAvatar name={t.name} appType={t.appType} status={t.status} size="sm" />,
        run: go(() => router.push(`${base}/apps/${t.id}`)),
      }))
    const q = query.trim().toLowerCase()
    return [...actions.filter((a) => !q || a.label.toLowerCase().includes(q)), ...apps]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants, query, base])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-900/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(items.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              items[active]?.run()
            }
          }}
        >
          <Dialog.Title className="sr-only">Search apps and actions</Dialog.Title>
          <Dialog.Description className="sr-only">Type to filter, use the arrow keys and Enter to choose.</Dialog.Description>
          <div className="flex items-center gap-3 px-4 border-b border-stone-100">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder="Search apps, owners, subdomains…"
              aria-label="Search"
              className="h-14 flex-1 bg-transparent text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline text-[10px] font-semibold text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">
              ESC
            </kbd>
          </div>
          <div ref={listRef} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
            {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-stone-500">No matches for “{query}”</p>}
            {items.map((item, i) => {
              const tenant = item.id.startsWith('app-') ? tenants.find((t) => `app-${t.id}` === item.id) : undefined
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={item.run}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                    i === active ? 'bg-endeavour/[0.07]' : ''
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0',
                      !tenant && 'h-8 w-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-900 truncate">{item.label}</span>
                    {item.hint && <span className="block text-xs text-stone-500 truncate">{item.hint}</span>}
                  </span>
                  {tenant && <StatusPill status={tenant.status} />}
                  {i === active &&
                    (tenant ? <ArrowRight className="h-4 w-4 text-stone-400" /> : <CornerDownLeft className="h-4 w-4 text-stone-400" />)}
                </button>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const openCommandPalette = () => window.dispatchEvent(new Event('open-command-palette'))

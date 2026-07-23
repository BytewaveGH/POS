'use client'

import React, { useState } from 'react'
import ButtonTemplate from '@/components/templates/button'
import { ROOT_DOMAIN, slugify } from '@/lib/tenant'

export interface TenantRecord {
  id: number
  name: string
  slug: string
  appType: string
  status: 'active' | 'suspended'
  createdAt: string
  ownerName: string
  ownerEmail: string
}

interface RegisterAppProps {
  mode: 'create' | 'update'
  initialData?: TenantRecord
  onSuccess: () => void
}

const APP_TYPES = [
  { value: 'retail', label: 'Retail / POS' },
  { value: 'eatery', label: 'Eatery' },
  { value: 'amusement', label: 'Amusement Park' },
]

export default function RegisterApp({ mode, initialData, onSuccess }: RegisterAppProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(mode === 'update')
  const [appType, setAppType] = useState(initialData?.appType ?? 'retail')
  const [status, setStatus] = useState<'active' | 'suspended'>(initialData?.status ?? 'active')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    setSlug(slugify(value))
  }

  const handleSubmit = async () => {
    if (!name.trim() || !slug) {
      setError('Business name and subdomain are required')
      return
    }
    if (mode === 'create' && (!ownerName.trim() || !ownerEmail.trim() || !password)) {
      setError('Owner name, email, and password are required')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(mode === 'create' ? '/api/tenants' : `/api/tenants/${initialData?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'create' ? { name, slug, appType, ownerName, ownerEmail, password } : { name, slug, appType, status }
        ),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.message ?? 'Something went wrong')
        return
      }
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Business name</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Acme Diner"
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Subdomain</label>
        <input
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="e.g. acme-diner"
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
        />
        <p className="text-[11px] text-gray-400 pl-1">
          Will be reachable at: <span className="font-semibold text-stone-600">{slug || 'yourbusiness'}.{ROOT_DOMAIN || 'yourdomain.com'}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">App type</label>
        <select
          value={appType}
          onChange={(e) => setAppType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
        >
          {APP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {mode === 'create' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Owner name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Owner email</label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="e.g. jane@acmediner.com"
              className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a login password for the owner"
              className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
            />
            <p className="text-[11px] text-gray-400 pl-1">The owner will use this email and password to sign in at their subdomain.</p>
          </div>
        </>
      )}

      {mode === 'update' && (
        <div className="flex flex-col gap-1.5">
          <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Status</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-1.5 bytewave-paragraph text-xs font-medium capitalize transition-colors ${
                  status === s ? (s === 'active' ? 'bg-green-600 text-white' : 'bg-red-500 text-white') : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <ButtonTemplate
        classname="w-full py-2.5 bg-endeavour text-white rounded-xl bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 transition-colors"
        isText
        isDisabled={loading}
        text={loading ? 'Saving...' : mode === 'create' ? 'Register App' : 'Save Changes'}
        handleClick={handleSubmit}
      />
    </div>
  )
}

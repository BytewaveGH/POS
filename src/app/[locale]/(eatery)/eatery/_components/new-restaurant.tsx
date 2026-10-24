'use client'

import React, { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/kit/ui'
import { Drawer, Field, FormGrid, Input, Select } from '@/components/kit/form'
import { useEateryActions } from '@/lib/eatery/hooks'
import { PRESETS, presetFor } from '@/lib/eatery/presets'
import { isSlug, newRestaurantDraft, slugify, starterSections } from '@/lib/eatery/setup'
import type { CategoryKey, Restaurant } from '@/lib/eatery/types'
import { BrandMark, Cover, ThemeScope } from '@/components/eatery/theme-scope'

// A preset, shown in its own clothes.
export const PresetCard = ({
  category,
  selected,
  onSelect,
  name,
}: {
  category: CategoryKey
  selected?: boolean
  onSelect: () => void
  name?: string
}) => {
  const p = presetFor(category)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative text-left rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-endeavour',
        selected ? 'ring-2 ring-endeavour ring-offset-2' : 'hover:-translate-y-0.5'
      )}
    >
      <ThemeScope theme={p.theme} className="overflow-hidden rounded-2xl border">
        <Cover theme={p.theme} className="h-20">
          <div className="flex h-full items-end p-3">
            <span className="e-display text-2xl leading-none" style={{ color: 'var(--e-cover-ink)' }}>
              {name || p.label.split(/[,&(]/)[0].trim()}
            </span>
          </div>
        </Cover>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <BrandMark restaurant={{ name: name || p.label, theme: p.theme }} size={28} />
            <p className="text-sm font-extrabold leading-tight">{p.label}</p>
          </div>
          <p className="mt-1.5 text-xs e-muted leading-snug line-clamp-2">{p.mood}</p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {[p.theme.colors.background, p.theme.colors.surface, p.theme.colors.primary, p.theme.colors.accent, p.theme.colors.text].map(
              (c, i) => (
                <span key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
              )
            )}
          </div>
        </div>
      </ThemeScope>
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-endeavour text-white">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}

export const NewRestaurantForm = ({
  open,
  onOpenChange,
  category: initial,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category?: CategoryKey
  onCreated: (r: Restaurant) => void
}) => {
  const actions = useEateryActions()
  const [category, setCategory] = useState<CategoryKey>(initial ?? 'general')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [city, setCity] = useState('Accra')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategory(initial ?? 'general')
    setName('')
    setSlug('')
    setSlugTouched(false)
    setAddress('')
    setPhone('')
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const finalSlug = slugTouched ? slug : slugify(name)
  const errors = {
    name: !name.trim() ? 'Give it a name' : undefined,
    slug: !isSlug(finalSlug) ? 'Use 3–48 lowercase letters, numbers and dashes' : undefined,
    address: !address.trim() ? 'Where is it?' : undefined,
  }

  const submit = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    setSaving(true)
    try {
      const r = await actions.create('restaurants', newRestaurantDraft({ name, slug: finalSlug, category, city, address, phone }))
      await actions.createMany('categories', starterSections(r.id, category))
      onCreated(r)
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Open a new restaurant"
      description="Pick what kind of place it is — you get a matching design and menu sections, all editable."
      error={actions.error}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Create restaurant
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[13px] font-semibold text-stone-700 mb-2">What kind of place?</p>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((p) => (
              <PresetCard key={p.key} category={p.key} name={name} selected={category === p.key} onSelect={() => setCategory(p.key)} />
            ))}
          </div>
        </div>
        <FormGrid>
          <Field label="Name" htmlFor="nr-name" error={tried ? errors.name : undefined}>
            <Input id="nr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Velvet Hour" />
          </Field>
          <Field
            label="Web address"
            htmlFor="nr-slug"
            hint={`Customers order at /eat/${finalSlug || '…'}`}
            error={tried ? errors.slug : undefined}
          >
            <Input
              id="nr-slug"
              value={finalSlug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase())
              }}
              prefix="/"
            />
          </Field>
          <Field label="Street / landmark" htmlFor="nr-address" error={tried ? errors.address : undefined}>
            <Input id="nr-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Oxford Street, Osu" />
          </Field>
          <Field label="City / town" htmlFor="nr-city">
            <Select
              id="nr-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              options={['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast', 'Ho', 'Koforidua', 'Tema'].map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="nr-phone" hint="Shown to customers">
            <Input id="nr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="024 123 4567" />
          </Field>
        </FormGrid>
      </div>
    </Drawer>
  )
}

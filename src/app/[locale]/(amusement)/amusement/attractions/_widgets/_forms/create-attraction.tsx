'use client'

import * as z from 'zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form'
import { Label } from '@radix-ui/react-label'
import { Wrench } from 'lucide-react'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { useAxios } from '@/hooks/use-axios'
import { AttractionServices } from '../../_logics/services'
import { ATTRACTION_TYPES, attractionTypeIcon, attractionTypeColor, attractionTypeLabel } from '../../_logics/attraction-types'

// Quick-fill presets — click one to pre-fill name + type, then just confirm
// capacity/price. The first four are the arena types this park is built around;
// the rest match Bambo's Adventure Park's (Accra) current lineup.
const ATTRACTION_PRESETS = [
  { name: 'Skating Arena', type: 'skating' as const },
  { name: 'Go-Karting Arena', type: 'go-karting' as const },
  { name: 'Arcade Room', type: 'arcade' as const },
  { name: 'Trampoline Arena', type: 'trampoline' as const },
  { name: 'Paintball Arena', type: 'paintball' as const },
  { name: 'Bubble Soccer', type: 'bubble-soccer' as const },
  { name: 'Foot Dart', type: 'foot-dart' as const },
  { name: 'Sumo Wrestling', type: 'sumo-wrestling' as const },
  { name: 'Human Foosball', type: 'human-foosball' as const },
]

const attractionSchema = z.object({
  name: z.string().min(1, 'Attraction name is required'),
  type: z.enum([
    'skating',
    'go-karting',
    'arcade',
    'trampoline',
    'paintball',
    'bubble-soccer',
    'foot-dart',
    'sumo-wrestling',
    'human-foosball',
    'other',
  ]),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative'),
  status: z.enum(['active', 'maintenance', 'closed']),
})

type AttractionForm = z.infer<typeof attractionSchema>

interface CreateAttractionProps {
  mode?: 'create' | 'update'
  attractionId?: number
  initialData?: Partial<AttractionForm>
  onSuccess?: () => void
}

const CreateAttraction = ({ mode = 'create', attractionId, initialData, onSuccess }: CreateAttractionProps) => {
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm<AttractionForm>({
    resolver: zodResolver(attractionSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      type: initialData?.type ?? 'other',
      capacity: initialData?.capacity ?? 1,
      ticketPrice: initialData?.ticketPrice ?? 0,
      status: initialData?.status ?? 'active',
    },
  })

  const selectedType = form.watch('type')
  const SelectedIcon = attractionTypeIcon(selectedType)

  const onSubmit = async (data: AttractionForm) => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      if (mode === 'update' && attractionId) {
        await request(AttractionServices.Update(attractionId, data))
      } else {
        await request(AttractionServices.Create(data))
      }
      form.reset()
      onSuccess?.()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error ?? 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex flex-col gap-4 py-2 flex-1">
          {/* Icon preview + custom-built hint — every attraction here is a bespoke
              build, not an off-the-shelf catalog item; the type only categorizes it. */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${attractionTypeColor(selectedType)}`}>
              <SelectedIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-700">{attractionTypeLabel(selectedType)}</p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Custom-built attraction — the type just categorizes it for reporting
              </p>
            </div>
          </div>
          {mode === 'create' && (
            <div className="flex flex-wrap gap-2">
              {ATTRACTION_PRESETS.map((preset) => {
                const PresetIcon = attractionTypeIcon(preset.type)
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => {
                      form.setValue('name', preset.name)
                      form.setValue('type', preset.type)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 text-stone-600 hover:border-endeavour hover:text-endeavour transition-colors"
                  >
                    <PresetIcon className="h-3 w-3" />
                    {preset.name}
                  </button>
                )
              })}
            </div>
          )}
          <InputsTemplate control={form.control} name="name" label="Attraction Name" placeholder="e.g. Skating Arena" isRequired />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="w-full">
                    <Label className="text-endeavour bytewave-paragraph">Type</Label>
                    <select
                      {...field}
                      className="w-full border border-grey-100 rounded-lg bytewave-paragraph p-2 mt-2 text-stone-500 bg-white"
                    >
                      {ATTRACTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <InputsTemplate
            control={form.control}
            name="capacity"
            label="Capacity"
            placeholder="e.g. 24"
            inputType="number"
            isRequired
          />
          <InputsTemplate
            control={form.control}
            name="ticketPrice"
            label="Ticket Price"
            placeholder="e.g. 15"
            inputType="number"
            isRequired
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="w-full">
                    <Label className="text-endeavour bytewave-paragraph">Status</Label>
                    <select
                      {...field}
                      className="w-full border border-grey-100 rounded-lg bytewave-paragraph p-2 mt-2 text-stone-500 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Under maintenance</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <ButtonTemplate
            isText
            text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Attraction' : 'Save Attraction'}
            type="submit"
            isDisabled={isSubmitting}
          />
        </div>
      </form>
    </Form>
  )
}

export default CreateAttraction

'use client'

import * as z from 'zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form'
import { Label } from '@radix-ui/react-label'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { useAxios } from '@/hooks/use-axios'
import { useFetchData } from '@/hooks/use-fetch'
import { IGeneric } from '@/types/interfaces'
import { BookingServices } from '../../_logics/services'
import { AttractionServices } from '../../../attractions/_logics/services'
import { attractionTypeLabel } from '../../../attractions/_logics/attraction-types'

const bookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  partySize: z.coerce.number().int().min(1, 'Party size must be at least 1'),
  attractionId: z.string().optional(),
  notes: z.string().optional(),
})

type BookingForm = z.infer<typeof bookingSchema>

interface CreateBookingProps {
  mode?: 'create' | 'update'
  bookingId?: number
  initialData?: Partial<BookingForm>
  onSuccess?: () => void
}

const CreateBooking = ({ mode = 'create', bookingId, initialData, onSuccess }: CreateBookingProps) => {
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { data: attractions } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: initialData?.customerName ?? '',
      phone: initialData?.phone ?? '',
      date: initialData?.date ?? '',
      partySize: initialData?.partySize ?? 1,
      attractionId: initialData?.attractionId ?? '',
      notes: initialData?.notes ?? '',
    },
  })

  const onSubmit = async (data: BookingForm) => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        attractionId: data.attractionId ? Number(data.attractionId) : null,
      }
      if (mode === 'update' && bookingId) {
        await request(BookingServices.Update(bookingId, payload))
      } else {
        await request(BookingServices.Create(payload))
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
          <InputsTemplate control={form.control} name="customerName" label="Customer Name" placeholder="e.g. Jane Doe" isRequired />
          <InputsTemplate control={form.control} name="phone" label="Phone" placeholder="e.g. 0551234567" />
          <InputsTemplate control={form.control} name="date" label="Booking Date" inputType="date" isRequired />
          <InputsTemplate control={form.control} name="partySize" label="Party Size" placeholder="e.g. 4" inputType="number" isRequired />
          <FormField
            control={form.control}
            name="attractionId"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="w-full">
                    <Label className="text-endeavour bytewave-paragraph">Attraction (optional)</Label>
                    <select
                      {...field}
                      className="w-full border border-grey-100 rounded-lg bytewave-paragraph p-2 mt-2 text-stone-500 bg-white"
                    >
                      <option value="">General visit</option>
                      {((attractions as unknown as any[]) ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({attractionTypeLabel(a.type)})
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
            name="notes"
            label="Notes"
            placeholder="Any special requests"
            isTextarea
            rowsHeight={2}
          />
        </div>
        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <ButtonTemplate
            isText
            text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Booking' : 'Save Booking'}
            type="submit"
            isDisabled={isSubmitting}
          />
        </div>
      </form>
    </Form>
  )
}

export default CreateBooking

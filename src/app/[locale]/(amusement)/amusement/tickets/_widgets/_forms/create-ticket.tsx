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
import { TicketServices } from '../../_logics/services'
import { AttractionServices } from '../../../attractions/_logics/services'
import { attractionTypeLabel } from '../../../attractions/_logics/attraction-types'

const ticketSchema = z.object({
  attractionId: z.string().optional(),
  buyerName: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
})

type TicketForm = z.infer<typeof ticketSchema>

interface CreateTicketProps {
  onSuccess?: () => void
}

const CreateTicket = ({ onSuccess }: CreateTicketProps) => {
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { data: attractions } = useFetchData('attractions', AttractionServices.FetchAll() as unknown as IGeneric)

  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { attractionId: '', buyerName: '', quantity: 1 },
  })

  const onSubmit = async (data: TicketForm) => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      await request(
        TicketServices.Create({
          attractionId: data.attractionId ? Number(data.attractionId) : null,
          buyerName: data.buyerName || undefined,
          quantity: data.quantity,
        })
      )
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
          <FormField
            control={form.control}
            name="attractionId"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="w-full">
                    <Label className="text-endeavour bytewave-paragraph">Attraction</Label>
                    <select
                      {...field}
                      className="w-full border border-grey-100 rounded-lg bytewave-paragraph p-2 mt-2 text-stone-500 bg-white"
                    >
                      <option value="">General Admission</option>
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
          <InputsTemplate control={form.control} name="buyerName" label="Buyer Name" placeholder="e.g. Jane Doe" />
          <InputsTemplate control={form.control} name="quantity" label="Quantity" placeholder="1" inputType="number" isRequired />
        </div>
        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <ButtonTemplate isText text={isSubmitting ? 'Selling...' : 'Sell Ticket'} type="submit" isDisabled={isSubmitting} />
        </div>
      </form>
    </Form>
  )
}

export default CreateTicket

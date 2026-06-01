'use client'

import * as z from 'zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { useAxios } from '@/hooks/use-axios'
import { UnitServices } from '../../_logics/services'

const unitSchema = z.object({
    name: z.string().min(1, 'Unit name is required'),
})

type UnitForm = z.infer<typeof unitSchema>

interface CreateUnitProps {
    mode?: 'create' | 'update'
    unitId?: number
    initialData?: Partial<UnitForm>
    onSuccess?: () => void
}

const CreateUnit = ({ mode = 'create', unitId, initialData, onSuccess }: CreateUnitProps) => {
    const request = useAxios()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    const form = useForm<UnitForm>({
        resolver: zodResolver(unitSchema),
        defaultValues: {
            name: initialData?.name ?? '',
        },
    })

    const onSubmit = async (data: UnitForm) => {
        setSubmitError('')
        setIsSubmitting(true)
        try {
            if (mode === 'update' && unitId) {
                await request(UnitServices.Update(unitId, data))
            } else {
                await request(UnitServices.Create(data))
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
                    <InputsTemplate
                        control={form.control}
                        name="name"
                        label="Unit Name"
                        placeholder="e.g. Kilogram"
                        isRequired
                    />
                    {/* <InputsTemplate
                        control={form.control}
                        name="shortName"
                        label="Short Name"
                        placeholder="e.g. kg"
                        isRequired
                    /> */}
                </div>
                <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
                    {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                    <ButtonTemplate
                        isText
                        text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Unit' : 'Save Unit'}
                        type="submit"
                        isDisabled={isSubmitting}
                    />
                </div>
            </form>
        </Form>
    )
}

export default CreateUnit

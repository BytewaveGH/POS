'use client'

import * as z from 'zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { useAxios } from '@/hooks/use-axios'
import { WarehouseServices } from '../../_logics/services'

const warehouseSchema = z.object({
    name: z.string().min(1, 'Warehouse name is required'),
    address: z.string().min(1, 'Address is required'),
})

type WarehouseForm = z.infer<typeof warehouseSchema>

interface CreateWarehouseProps {
    mode?: 'create' | 'update'
    warehouseId?: number
    initialData?: Partial<WarehouseForm>
    onSuccess?: () => void
}

const CreateWarehouse = ({ mode = 'create', warehouseId, initialData, onSuccess }: CreateWarehouseProps) => {
    const request = useAxios()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    const form = useForm<WarehouseForm>({
        resolver: zodResolver(warehouseSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            address: initialData?.address ?? '',
        },
    })

    const onSubmit = async (data: WarehouseForm) => {
        setSubmitError('')
        setIsSubmitting(true)
        try {
            if (mode === 'update' && warehouseId) {
                await request(WarehouseServices.Update(warehouseId, data))
            } else {
                await request(WarehouseServices.Create(data))
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
                        label="Warehouse Name"
                        placeholder="e.g. Main Warehouse"
                        isRequired
                    />
                    <InputsTemplate
                        control={form.control}
                        name="address"
                        label="Address"
                        placeholder="e.g. 12 Industrial Ave, Accra"
                        isTextarea
                        rowsHeight={2}
                        isRequired
                    />
                </div>
                <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
                    {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                    <ButtonTemplate
                        isText
                        text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Warehouse' : 'Save Warehouse'}
                        type="submit"
                        isDisabled={isSubmitting}
                    />
                </div>
            </form>
        </Form>
    )
}

export default CreateWarehouse

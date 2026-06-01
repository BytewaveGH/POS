'use client'

import * as z from 'zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { SelectTemplate } from '@/components/templates/select-template'
import { useAxios } from '@/hooks/use-axios'
import { OperationsServices } from '../../_logics/services'

const operationSchema = z.object({
    name:      z.string().min(1, 'Name is required'),
    category:  z.string().min(1, 'Category is required'),
    amount:    z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    date:      z.string().min(1, 'Date is required'),
    frequency: z.string().min(1, 'Frequency is required'),
})

type OperationForm = z.infer<typeof operationSchema>

interface CreateOperationProps {
    mode?:        'create' | 'update'
    operationId?: number
    initialData?: Partial<OperationForm>
    onSuccess?:   () => void
}

const categoryOptions = [
    { text: 'Delivery Costs',       value: 'delivery-costs'       },
    { text: 'Offloading Costs',     value: 'offloading-costs'     },
    { text: 'Labour Payments',      value: 'labour-payments'      },
    { text: 'Transport Costs',      value: 'transport-costs'      },
    { text: 'Warehouse Expenses',   value: 'warehouse-expenses'   },
    { text: 'Fuel Expenses',        value: 'fuel-expenses'        },
    { text: 'Miscellaneous Expenses', value: 'miscellaneous'      },
]

const frequencyOptions = [
    { text: 'One-time',  value: 'one-time'  },
    { text: 'Daily',     value: 'daily'     },
    { text: 'Weekly',    value: 'weekly'    },
    { text: 'Monthly',   value: 'monthly'   },
]

const CreateOperation = ({ mode = 'create', operationId, initialData, onSuccess }: CreateOperationProps) => {
    const request = useAxios()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    const today = new Date().toISOString().split('T')[0]

    const form = useForm<OperationForm>({
        resolver: zodResolver(operationSchema),
        defaultValues: {
            name:      initialData?.name      ?? '',
            category:  initialData?.category  ?? '',
            amount:    initialData?.amount    ?? 0,
            date:      initialData?.date      ?? today,
            frequency: initialData?.frequency ?? 'one-time',
        },
    })

    const onSubmit = async (data: OperationForm) => {
        setSubmitError('')
        setIsSubmitting(true)
        try {
            if (mode === 'update' && operationId) {
                await request(OperationsServices.Update(operationId, data))
            } else {
                await request(OperationsServices.Create(data))
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
                        label="Operation Name"
                        placeholder="e.g. Monthly Rent"
                        isRequired
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <SelectTemplate
                            control={form.control}
                            name="category"
                            label="Category"
                            placeholder="Select category"
                            content={categoryOptions}
                        />
                        <SelectTemplate
                            control={form.control}
                            name="frequency"
                            label="Frequency"
                            placeholder="Select frequency"
                            content={frequencyOptions}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputsTemplate
                            control={form.control}
                            name="amount"
                            label="Amount (₵)"
                            placeholder="0.00"
                            inputType="number"
                            isRequired
                        />
                        <InputsTemplate
                            control={form.control}
                            name="date"
                            label="Date"
                            placeholder="YYYY-MM-DD"
                            inputType="date"
                            isRequired
                        />
                    </div>

                    
                </div>

                <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
                    {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                    <ButtonTemplate
                        isText
                        text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Operation' : 'Add Operation'}
                        type="submit"
                        isDisabled={isSubmitting}
                    />
                </div>
            </form>
        </Form>
    )
}

export default CreateOperation

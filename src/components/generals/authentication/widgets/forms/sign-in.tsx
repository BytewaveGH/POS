'use client'

import * as z from 'zod'
import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { UpdateStates } from '@/lib/functions/update-states'
import ToastTemplate from '@/components/templates/toast'
import InputsTemplate from '@/components/templates/inputs'
import { CheckboxTemplate } from '@/components/templates/checkbox'

interface PassStateTypes {
    showPassword: 'text' | 'password'
    isLoading: boolean
}

const formSchema = z.object({
    email: z.string().min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required'),
})

type FormType = z.infer<typeof formSchema>

export default function SignInForm() {
    const signInText = useTranslations('Authentication')
    const router = useRouter()
    const params = useParams()
    const locale = (params?.locale as string) || 'en'

    const [error, setError] = useState('')
    const [states, setStates] = useState<PassStateTypes>({
        showPassword: 'password',
        isLoading: false,
    })

    const form = useForm<FormType>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: '', password: '' },
    })

    const onSubmit = async (data: FormType) => {
        setError('')
        UpdateStates(setStates, 'isLoading', true)
        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })
            if (result?.error) {
                setError('Invalid email or password')
            } else {
                router.push(`/${locale}/stores/overview`)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            UpdateStates(setStates, 'isLoading', false)
        }
    }

    return (
        <div className="w-full px-12 flex justify-center">
            <ToastTemplate position="top-right" />

            <div className="flex flex-col justify-center items-center h-svh py-10 w-full">
                <div className="flex justify-center w-full">
                    <h1 className="bytewave-heading">{signInText('byteWave')}</h1>
                </div>
                <div className="w-full flex justify-center">
                    <div className="grid items-center gap-1.5 mt-40 ml-6 w-[500px]">
                        <div className="bytewave-heading font-mulish-regular text-gray-700 mb-4">{signInText('logIn')}</div>
                        {error && (
                            <p className="text-center bytewave-sub-heading text-red-500 font-mulish-regular italic">{error}</p>
                        )}
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <InputsTemplate
                                    control={form.control}
                                    name="email"
                                    label="Email"
                                    placeholder="Enter your email"
                                />
                                <InputsTemplate
                                    control={form.control}
                                    isPassword
                                    name="password"
                                    inputType={states.showPassword}
                                    label={`${signInText('password')}`}
                                    parentClassname="mt-4"
                                    placeholder="XXXXXXXXX"
                                />
                                <div className="mt-4 ml-1">
                                    <CheckboxTemplate
                                        handleValueChange={(e) => {
                                            UpdateStates(setStates, 'showPassword', e ? 'text' : 'password')
                                        }}
                                        label={`${signInText('showPassword')}`}
                                        className=""
                                    />
                                </div>
                                <div className="text-right bytewave-paragraph mt-6 hover:cursor-pointer hover:underline text-endeavour">
                                    <Link href={`/${locale}/forgot-password`}>{`${signInText('forgotPassword')}`}</Link>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={states.isLoading}
                                    className="bg-endeavour text-white text-xs w-full mt-5 hover:bg-veniceBlue h-9 disabled:opacity-60"
                                >
                                    {states.isLoading ? 'Signing in...' : `${signInText('login')}`}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    )
}

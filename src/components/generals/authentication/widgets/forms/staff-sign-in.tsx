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
import InputsTemplate from '@/components/templates/inputs'

const formSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormType = z.infer<typeof formSchema>

export default function StaffSignInForm() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormType) => {
    setError('')
    setIsLoading(true)
    try {
      const result = await signIn('employee-credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Middleware redirects to first allowed route if /pos is blocked
        router.push(`/${locale}/stores/pos`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full px-12 flex justify-center">
      <div className="flex flex-col justify-center items-center h-svh py-10 w-full">
        <div className="flex justify-center w-full">
          <h1 className="bytewave-heading">Bytewave POS</h1>
        </div>
        <div className="w-full flex justify-center">
          <div className="grid items-center gap-1.5 mt-40 ml-6 w-[500px]">
            <div className="bytewave-heading font-mulish-regular text-gray-700 mb-1">Staff Login</div>
            <p className="bytewave-paragraph text-gray-400 mb-4">Sign in with your staff credentials</p>

            {error && <p className="text-center bytewave-sub-heading text-red-500 font-mulish-regular italic mb-2">{error}</p>}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <InputsTemplate control={form.control} name="email" label="Email" placeholder="Enter your email" inputType="email" />
                <InputsTemplate
                  control={form.control}
                  isPassword
                  name="password"
                  label="Password"
                  parentClassname="mt-4"
                  placeholder="••••••••"
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-endeavour text-white text-xs w-full mt-6 hover:bg-veniceBlue h-9 disabled:opacity-60"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <p className="text-center bytewave-paragraph text-gray-400 mt-6">
              Store owner?{' '}
              <Link href={`/${locale}`} className="text-endeavour hover:underline">
                Admin login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

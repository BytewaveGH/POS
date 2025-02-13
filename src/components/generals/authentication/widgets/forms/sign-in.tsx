'use client'

import * as z from 'zod'
import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'

import { useTranslations } from 'next-intl'
import { UpdateStates } from '@/lib/functions/update-states'
import ToastTemplate from '@/components/templates/toast'
import InputsTemplate from '@/components/templates/inputs'
import { CheckboxTemplate } from '@/components/templates/checkbox'

interface PassStateTypes {
  showPassword: 'text' | 'password'
}
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: 'Password must be 8 characters or more' }),
})

type FormType = z.infer<typeof formSchema>

export default function SignInForm() {
  const signInText = useTranslations('Authentication')

  const [error, setError] = useState('')
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  //   const onSubmit: SubmitHandler<FormType> = async (data) => {
  //     const toastId = toast.loading('Getting you logged in')
  //     try {
  //       const res = await signInAction(data)
  //       if (res?.error) {
  //         toast.dismiss(toastId)
  //         // setError(res.error)
  //         toast.error('Error', {
  //           description: `${res.error}`,
  //         })
  //       } else {
  //         const updatedSession = await getSession()
  //         toast.dismiss(toastId)
  //         toast.success('Success', {
  //           description: `Login Successful`,
  //         })
  //         zusUpdateState('userSession', updatedSession)
  //         // switch (updatedSession?.user.userType) {
  //         //   case 'admin':{
  //         //     router.push(`/${locale}/organization/merl/cockpit`)
  //         //     break
  //         //   }
  //         //   case 'staff':{
  //         //     router.push(`/${locale}/staff`)
  //         //     break
  //         //   }
  //         //   default:{
  //         //     router.push(`/${locale}/launch/horo-chat`)
  //         //   }
  //         // }
  //       }
  //     } catch {
  //       toast.dismiss(toastId)
  //     }
  //   }

  const [states, setStates] = useState<PassStateTypes>({
    showPassword: 'password',
  })

  return (
    <div className="w-full px-12 flex justify-center">
      <ToastTemplate position="top-right" />

      <div className="flex flex-col  justify-center items-center h-svh py-10  w-full">
        <div className="flex justify-center w-full">
          {/* <SeedstarLogo fill="#0865ac" width={250} /> */}
          {/* <SigmaLogo fill="#0865ac" width={250} /> */}
          <h1 className=" bytewave-heading">{signInText('byteWave')}</h1>
        </div>
        <div className=" w-full flex justify-center">
          <div className="grid items-center gap-1.5 mt-40 ml-6 w-[500px] ">
            <div className=" bytewave-heading font-mulish-regular  text-gray-700 mb-4">{signInText('logIn')}</div>
            {error ? <p className="text-center bytewave-sub-heading text-red-500 font-mulish-regular italic">{error}</p> : null}
            <Form {...form}>
              {/* <form onSubmit={form.handleSubmit(onSubmit)}> */}
              <form>
                <InputsTemplate name={'email'} inputType="email" label={`${signInText('email')}`} placeholder="Email" />
                <InputsTemplate
                  isPassword
                  name={'password'}
                  inputType={states.showPassword}
                  label={`${signInText('password')}`}
                  parentClassname="mt-4"
                  placeholder="XXXXXXXXX"
                />
                <div className="mt-4 ml-1">
                  <CheckboxTemplate
                    handleValueChange={(e) => {
                      if (e) {
                        UpdateStates(setStates, 'showPassword', 'text')
                      } else {
                        UpdateStates(setStates, 'showPassword', 'password')
                      }
                    }}
                    label={`${signInText('showPassword')}`}
                    className={''}
                  />
                </div>
                <div className="text-right bytewave-paragraph mt-6 hover:cursor-pointer hover:underline text-endeavour">
                  <Link href="en/forgot-password">{`${signInText('forgotPassword')}`}</Link>
                </div>

                <Button type="submit" className="bg-endeavour text-white text-xs w-full mt-5 hover:bg-veniceBlue  h-9">
                  {`${signInText('login')}`}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}

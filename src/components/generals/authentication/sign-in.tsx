'use client'

import Image from 'next/image'
import SignInForm from './widgets/forms/sign-in'
import loginImg from '@/assets/login.jpg'

export default function SignIn() {
  return (
    <main className="max-h-screen flex items-center">
      <section id="login-wrapper" className="flex flex-col md:flex-row justify-center items-center w-full">
        {/* Image Section (Hidden on Small Screens) */}
        <div className="hidden md:block md:w-1/2">
          <div className="h-svh py-4 mr-8">
            <div className="h-full w-full relative mx-4">
              <Image
                src={loginImg}
                layout="fill"
                // objectFit="cover"
                alt="Login Image"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Form Section (Full Width on Small Screens, Half Width on Medium Screens and Above) */}
        <div className="w-full md:w-1/2 flex justify-center">
          <SignInForm />
        </div>
      </section>
    </main>
  )
}

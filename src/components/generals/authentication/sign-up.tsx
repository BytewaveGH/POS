'use client'

import Image from 'next/image'
import authImg from '@/assets/images/auth.png'
import SignInForm from './widgets/forms/sign-in'

export default function SignIn() {

  return (
    <main className=" max-h-screen  items-center ">
      <section id="login-wrapper" className="flex">
        <div className="w-1/2">
          <div className=" h-svh py-4 mr-8">
            <div className="h-full w-full relative mx-4">
              <Image
                src={authImg}
                layout="fill" // required
                objectFit="cover" // change to suit your needs
                alt="Picture of the author"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
        <SignInForm />
      </section>
    </main>
  )
}

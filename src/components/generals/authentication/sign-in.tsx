'use client'

import Image from 'next/image'
import { UtensilsCrossed, FerrisWheel } from 'lucide-react'
import SignInForm from './widgets/forms/sign-in'
import loginImg from '@/assets/images/sel2.jpeg'

interface SignInProps {
  appType?: string
}

const THEMED_PANELS: Record<string, { gradient: string; icon: React.ElementType; label: string }> = {
  eatery: { gradient: 'from-amber-500 to-orange-600', icon: UtensilsCrossed, label: 'Eatery' },
  amusement: { gradient: 'from-purple-500 to-indigo-600', icon: FerrisWheel, label: 'Amusement Park' },
}

export default function SignIn({ appType = 'retail' }: SignInProps) {
  const themed = THEMED_PANELS[appType]

  return (
    <main className="max-h-screen flex items-center">
      <section id="login-wrapper" className="flex flex-col md:flex-row justify-center items-center w-full">
        {/* Image Section (Hidden on Small Screens) */}
        <div className="hidden md:block md:w-1/2">
          <div className="h-svh py-4 mr-8">
            {themed ? (
              <div
                className={`h-full w-full mx-4 rounded-xl bg-gradient-to-br ${themed.gradient} flex flex-col items-center justify-center gap-4`}
              >
                <themed.icon className="h-24 w-24 text-white/90" strokeWidth={1.25} />
                <p className="bytewave-heading text-2xl text-white/95">{themed.label}</p>
              </div>
            ) : (
              <div className="h-full w-full relative mx-4">
                <Image src={loginImg} fill sizes="50vw" alt="Login Image" className="rounded-xl object-cover" priority />
              </div>
            )}
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

'use client'

import { signOut } from 'next-auth/react'
import React from 'react'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AvatarTemplate from '@/components/templates/avatar'
import Link from 'next/link'
import { useBrowserStorage } from '@/hooks/use-browser-storage'
import { PopoverTemplate } from '@/components/templates/popover'


interface ProfileAvatarProps {
  image: React.JSX.Element
}

const ProfileAvatar = ({ image }: ProfileAvatarProps) => {
  const router = useRouter()
  const { getValue } = useBrowserStorage('local')

  // useEffect(() => {}, [router])

  return (
    <PopoverTemplate
      contentClassName="bg-white w-60 mr-6"
      trigger={<div className="flex space-x-2 items-center py-2 ml-5  cursor-pointer">{image}</div>}
      content={[
        // <div className="space-y-1">
        <div key={"avatar"} className="w-full flex gap-2 items-center">
          <AvatarTemplate src={""} />
          <div className='w-full'>
            <p className="seedstars-paragraph font-mulish-semi-bold line-clamp-2">{`${""} `}</p>
            <h5 className="seedstars-link text-endeavour  line-clamp-1 text-ellipsis overflow-hidden whitespace-nowrap">{`${""}`}</h5>
          </div>
        </div>,

        <Link key={"link"} className="p-2  hover:bg-gray-100  flex items-center rounded cursor-pointer" href="/en/launch/profile">
          {/* <SeedstarUserVerify fill={'#0865AC'} width={18} height={18} /> */}
          <p className="seedstars-paragraph p-1 text-stone-500 ">Profile</p>
        </Link>,

        // <Separator className="bg-gray-200" />,
        <div
            key={"logout"}
          className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
          onClick={async () => {
            await signOut({ callbackUrl: `/${getValue('locale') ?? 'en'}`, redirect: false })
            // alert("You've been logged out. Redirecting to the home page...")
            router.push(`/${getValue('locale') ?? 'en'}`)
            // if (typeof window !== 'undefined') {
            //   const subDomain = window.location.host.split('.')[0]
            //   const domain = window.location.host.split('.')[1]
            //   const org = window.location.host.split('.')[2]
            //   const url = `${window.location.protocol}//${subDomain}.${domain}.${org}/en`
            //   console.log({ pathname: window.location.hostname })
            //   if (window.location.hostname === 'localhost') {
            //     //window.location.replace(window.location.protocol + window.location.host + '/en')
            //     router.push('/')
            //   } else {
            //     window.location.replace(url)
            //   }
            // }
          }}
        >
          <LogOut size={16} className="text-endeavour" />{' '}
          <span className="inline-block ml-2 seedstars-paragraph text-stone-500">Log Out</span>
        </div>,
        // {/* </div> */}
      ]}
    />
  )
}

export default ProfileAvatar

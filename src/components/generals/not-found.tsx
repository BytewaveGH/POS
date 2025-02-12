import React from 'react'
import Image from 'next/image'
import notfound from '@/assets/images/notFound.jpg'

const NotFoundPage = () => {
  return (
    <div className="w-full h-full">
      <section className="w-full h-full mx-auto py-16 ">
        <Image src={notfound} alt="404 NotFound" className="mx-auto flex mt-16 items-center" />
      </section>
      <footer className="flex space-x-4 mx-auto">
        {/* <ButtonTemplate isText text={'Go Back'} classname="mx-auto px-5 rounded-md" /> */}
      </footer>
    </div>
  )
}

export default NotFoundPage

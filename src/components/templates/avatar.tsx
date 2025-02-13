'use client'

import React, { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  avatarStyles?: React.CSSProperties
  className?: string
  isBase64?: boolean
}

const AvatarTemplate: React.FC<AvatarProps> = ({ avatarStyles, className, src, alt = 'User Avatar', fallback = '', isBase64 }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsError(true)
        setIsLoading(false)
      }
    }, 20_000) // 20-second fallback if image doesn't load

    return () => clearTimeout(timer)
  }, [isLoading])

  return (
    <Avatar style={avatarStyles} className={className}>
      {src && !isError ? (
        <>
          {isLoading && (
            <div className="w-full h-full bg-gray-300 animate-pulse rounded-full flex justify-center items-center">
              {/* <SeedstarUserAvatarIcon width={100} height={100} /> */}
            </div>
          )}

          <AvatarImage
            src={isBase64 ? `data:image/png;base64,${src}` : src}
            alt={alt}
            onLoadingStatusChange={(status: 'idle' | 'loading' | 'loaded' | 'error') => {
              if (status === 'loaded') {
                setIsLoading(false)
              }
              if (status === 'error') {
                setIsError(true)
                setIsLoading(false)
              }
            }}
            className={`rounded-full ${isLoading ? 'hidden' : ''}`}
          />
        </>
      ) : (
        <AvatarFallback delayMs={600}>{fallback || "<SeedstarUserAvatarIcon width={100} height={100} />"}</AvatarFallback>
      )}
    </Avatar>
  )
}

export default AvatarTemplate

// import React from 'react'
// import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
// import { SeedstarUserAvatarIcon } from '@/assets/svgs-conventable/svgs'

// interface AvatarProps {
//   src?: string
//   alt?: string
//   fallback?: string
//   avatarStyles?: any
//   classname?: string
// }

// const AvatarTemplate: React.FC<AvatarProps> = ({ avatarStyles, classname, src }) => {
//   return (
//     <Avatar style={avatarStyles} className={classname}>
//       {/* Use next/image for the avatar image */}
//       {src !== undefined ? (
//         <>
//           <AvatarImage onLoadingStatusChange={(status: 'idle' | 'loading' | 'loaded' | 'error') => {}} src={src} alt={'avatar image'} />
//         </>
//       ) : (
//         <>
//           <AvatarFallback delayMs={600}>
//             <SeedstarUserAvatarIcon width={100} height={100} />
//           </AvatarFallback>
//         </>
//       )}
//     </Avatar>
//   )
// }

// export default AvatarTemplate

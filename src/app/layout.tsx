import { Providers } from '@/components/generals/providers'
import type { Metadata } from 'next'
import { Mulish } from 'next/font/google'
// import { Providers } from '@/components/providers'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '800', '900'],
  variable: '--font-mulish',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Seedstars IG',
  description: 'Seedstars IG',
}

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: {
    locale: string
  }
}>) {
  return (
    <html lang={locale}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body className={`${mulish.variable} font-mulish`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

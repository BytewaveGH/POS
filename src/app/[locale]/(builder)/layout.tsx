import ILayout from '@/components/generals/layouts'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'Seedstars IG',
  description: 'Seedstars IG',
}

export default async function Layout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: {
    locale: string
  }
}>) {
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ILayout children={children} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

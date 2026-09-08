import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

import { ServiceWorkerRegister } from '@/components/service-worker-register'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'PetVitals',
  description: '慢性腎病貓咪居家照護紀錄與回診報告工具'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-TW" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

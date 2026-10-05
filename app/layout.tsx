import type { Metadata } from 'next'
import './globals.css'

import { ServiceWorkerRegister } from '@/components/service-worker-register'

export const metadata: Metadata = {
  title: 'PetVitals',
  description: '慢性腎病貓咪居家照護紀錄與回診報告工具'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* next/font/google 的 Noto Sans TC 子集清單沒有涵蓋中文字符範圍，自動子集化對
            這個字型沒有用，改用 Google 官方 <link> 載入完整字重，確保繁體中文正確套用字型。
            eslint 的 no-page-custom-font 規則只適用於 Pages Router 的 pages/_document.js，
            這裡是 App Router 的 root layout，官方文件本身就建議這樣寫，是已知的誤報 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

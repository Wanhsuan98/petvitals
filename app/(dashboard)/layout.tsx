'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

// 底部手機導航列 (Tab Bar: 首頁 / 打卡 / 報告 / 設定)
const TABS = [
  { href: '/', label: '首頁' },
  { href: '/log', label: '打卡' },
  { href: '/records', label: '報告' },
  { href: '/settings', label: '設定' }
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 p-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-background">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex-1 py-3 text-center text-sm',
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

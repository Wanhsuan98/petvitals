'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, FileText, House, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

// 底部手機導航列 (Tab Bar: 首頁 / 打卡 / 報告 / 設定)
const TABS = [
  { href: '/', label: '首頁', icon: House },
  { href: '/log', label: '打卡', icon: ClipboardCheck },
  { href: '/records', label: '報告', icon: FileText },
  { href: '/settings', label: '設定', icon: Settings }
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 p-4 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex gap-1 border-t bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs transition-colors',
                isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
              <Icon className="size-5" aria-hidden="true" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// 色碼直接取自 Sleek 產出的首頁設計（見 app/globals.css 開頭的說明），
// 每張捷徑卡一個專屬色調的圖示徽章，用來快速區分四個不同的操作
const TINT_STYLES = {
  sage: 'bg-secondary text-primary',
  terracotta: 'bg-[#F5E5D8] text-accent dark:bg-accent/20 dark:text-accent',
  gold: 'bg-[#F7EED5] text-[#A77A28] dark:bg-[#A77A28]/20 dark:text-[#E0BD73]',
  lavender: 'bg-[#EAE6EF] text-[#76638C] dark:bg-[#76638C]/30 dark:text-[#C9BEDB]'
} as const

export function QuickActionCard({
  href,
  icon: Icon,
  tint,
  title,
  description
}: {
  href: string
  icon: LucideIcon
  tint: keyof typeof TINT_STYLES
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex min-h-36.25 flex-col items-start justify-between rounded-[20px] bg-card p-4 text-left text-sm shadow-(--card-shadow) transition-transform active:scale-[0.98]"
    >
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-2xl',
          TINT_STYLES[tint]
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[15px] font-bold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

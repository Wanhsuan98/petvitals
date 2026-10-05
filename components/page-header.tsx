import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// 子頁面（例如新增血檢、提醒排程管理）共用的頁首：返回箭頭 + 標題，
// 讓使用者不用只靠底部 Tab 列或瀏覽器返回鍵才能離開這一層
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <Link
        href={backHref}
        aria-label="返回"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Link>
      <h1 className="font-heading text-lg font-bold">{title}</h1>
      {/* 跟返回按鈕等寬的佔位，讓標題視覺置中 */}
      <div className="w-10" aria-hidden="true" />
    </div>
  )
}
